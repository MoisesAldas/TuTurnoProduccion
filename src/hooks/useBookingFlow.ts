import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEmployeeFiltering } from "@/hooks/useEmployeeFiltering";
import { useClientBookingStatus } from "@/hooks/useClientBookingStatus";
import {
  formatDateForDB,
  calculateTotalDuration,
  getSequentialServiceData,
} from "@/lib/booking/bookingUtils";
import { bookingService } from "@/services/booking/bookingService";

export type BookingStep =
  | "service"
  | "employee"
  | "datetime"
  | "details"
  | "confirmation";

export interface Business {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  min_booking_hours: number;
  max_booking_days: number;
  cancellation_policy_text?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration_minutes: number;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  avatar_url?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface SpecialHour {
  special_date: string;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
  reason: string;
  description: string | null;
}

export function useBookingFlow() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authState } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();

  const businessId = params.id as string;
  const preSelectedServiceId = searchParams.get("service");

  // --- State ---
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [allEmployeeServices, setAllEmployeeServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<BookingStep>("service");

  // Selections
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [serviceEmployeeAssignments, setServiceEmployeeAssignments] = useState<
    Record<string, Employee | null>
  >({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [clientNotes, setClientNotes] = useState("");

  // Settings & Restrictions
  const [minDate, setMinDate] = useState<Date>(new Date());
  const [maxDate, setMaxDate] = useState<Date>(new Date());
  const [specialHourForDate, setSpecialHourForDate] =
    useState<SpecialHour | null>(null);
  const [checkingSpecialHours, setCheckingSpecialHours] = useState(false);
  const [isOpenToday, setIsOpenToday] = useState<boolean>(false);

  // External Hooks
  const { status: bookingStatus, loading: checkingBlockStatus } =
    useClientBookingStatus(authState?.user?.id || null, businessId);

  const { filteredEmployees: employees, isLoading: loadingEmployees } =
    useEmployeeFiltering(selectedServices, allEmployees);

  // --- Memos ---
  const totalDuration = useMemo(
    () => calculateTotalDuration(selectedServices, serviceEmployeeAssignments),
    [selectedServices, serviceEmployeeAssignments],
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, service) => sum + service.price, 0),
    [selectedServices],
  );

  const leadEmployee = useMemo(() => {
    if (selectedServices.length === 0) return null;
    // The lead is the employee assigned to the FIRST chosen service.
    const firstServiceId = selectedServices[0].id;
    return serviceEmployeeAssignments[firstServiceId] || null;
  }, [selectedServices, serviceEmployeeAssignments]);

  // --- Core Functions ---
  const fetchData = useCallback(async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const { data: businessData, error: businessError } =
        await bookingService.getBusiness(businessId);

      if (businessError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el negocio",
        });
        router.push("/marketplace");
        return;
      }
      if (businessData) setBusiness(businessData);

      const now = new Date();
      const minBookingHours = businessData?.min_booking_hours || 1;
      const maxBookingDays = businessData?.max_booking_days || 90;

      const calculatedMinDate = new Date();
      calculatedMinDate.setHours(
        calculatedMinDate.getHours() + minBookingHours,
      );
      setMinDate(calculatedMinDate);

      const calculatedMaxDate = new Date();
      calculatedMaxDate.setDate(calculatedMaxDate.getDate() + maxBookingDays);
      setMaxDate(calculatedMaxDate);

      const { data: srvs } = await bookingService.getServices(businessId);
      setServices(srvs || []);

      const { data: emps } = await bookingService.getEmployees(businessId);
      setAllEmployees(emps || []);

      const { data: skills } = await bookingService.getEmployeeServices();
      setAllEmployeeServices(skills || []);

      // Open Today check
      const dayOfWeek = now.getDay();
      const todayStr = formatDateForDB(now);
      const { data: specialToday } = await bookingService.getSpecialHours(
        businessId,
        todayStr,
      );

      if (specialToday?.is_closed) {
        setIsOpenToday(false);
      } else {
        const { data: regularToday } = await bookingService.getBusinessHours(
          businessId,
          dayOfWeek,
        );
        setIsOpenToday(regularToday ? !regularToday.is_closed : false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [businessId, router, toast]);

  const checkSpecialHours = useCallback(
    async (date: Date) => {
      if (!businessId) return;
      try {
        setCheckingSpecialHours(true);
        const dateStr = formatDateForDB(date);
        const { data, error } = await bookingService.getSpecialHours(
          businessId,
          dateStr,
        );
        if (!error) setSpecialHourForDate(data);
      } finally {
        setCheckingSpecialHours(false);
      }
    },
    [businessId],
  );

  const generateTimeSlots = useCallback(async () => {
    const assignedEmployees = Object.values(serviceEmployeeAssignments).filter(
      Boolean,
    ) as Employee[];
    if (
      !selectedDate ||
      assignedEmployees.length === 0 ||
      selectedServices.length === 0 ||
      !businessId
    )
      return;

    const selectedDateStr = formatDateForDB(selectedDate);
    const dayOfWeek = selectedDate.getDay();

    let regularHours: { open_time: string; close_time: string } | null = null;
    const { data: bHours } = await bookingService.getBusinessHours(
      businessId,
      dayOfWeek,
    );

    if (bHours?.is_closed) {
      setAvailableSlots([]);
      return;
    }
    if (bHours?.open_time && bHours?.close_time) {
      regularHours = {
        open_time: bHours.open_time,
        close_time: bHours.close_time,
      };
    }

    let startHour = 9,
      endHour = 18;
    if (
      specialHourForDate &&
      !specialHourForDate.is_closed &&
      specialHourForDate.open_time &&
      specialHourForDate.close_time
    ) {
      startHour = parseInt(specialHourForDate.open_time.split(":")[0]);
      endHour = parseInt(specialHourForDate.close_time.split(":")[0]);
    } else if (regularHours) {
      startHour = parseInt(regularHours.open_time.split(":")[0]);
      endHour = parseInt(regularHours.close_time.split(":")[0]);
    }

    const slotDuration = 30;
    const businessStart = `${String(startHour).padStart(2, "0")}:00:00`;
    const businessEnd = `${String(endHour).padStart(2, "0")}:00:00`;

    // Sequence of services as they appear in the sorted selectedServices.
    const { ids: employeeIds, durations } = getSequentialServiceData(
      selectedServices,
      serviceEmployeeAssignments,
    );

    const { data: rpcSlots } = await bookingService.getGranularAvailability({
      p_business_id: businessId,
      p_employee_ids: employeeIds,
      p_durations: durations,
      p_date: selectedDateStr,
      p_business_start: businessStart,
      p_business_end: businessEnd,
      p_slot_step_minutes: slotDuration,
    });

    if (rpcSlots) {
      const slots: TimeSlot[] = rpcSlots.map((s: any) => ({
        time: s.slot_time.substring(0, 5),
        available: true,
      }));
      setAvailableSlots(slots);
    }
  }, [
    businessId,
    selectedDate,
    selectedServices,
    serviceEmployeeAssignments,
    specialHourForDate,
  ]);

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (preSelectedServiceId && services.length > 0) {
      const service = services.find((s) => s.id === preSelectedServiceId);
      if (service && selectedServices.length === 0) {
        setSelectedServices([service]);
      }
    }
  }, [preSelectedServiceId, services, selectedServices.length]);

  useEffect(() => {
    if (selectedDate) {
      checkSpecialHours(selectedDate);
      setSelectedTime("");
    }
  }, [selectedDate, checkSpecialHours]);

  useEffect(() => {
    if (selectedDate && Object.keys(serviceEmployeeAssignments).length > 0) {
      generateTimeSlots();
    }
  }, [selectedDate, serviceEmployeeAssignments, generateTimeSlots]);

  const handleServiceSelect = (service: Service) => {
    setSelectedServices((prev) => {
      const isSelected = prev.some((s) => s.id === service.id);
      if (isSelected) {
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });

    // Reset assignments for the service if it was just toggled
    setServiceEmployeeAssignments((prev) => {
      const newAssignments = { ...prev };
      // If it exists, we remove it to force a re-assignment (optional, but safer for UX)
      if (newAssignments[service.id]) {
        delete newAssignments[service.id];
      }
      return newAssignments;
    });
  };

  const handleContinueToEmployee = () => {
    if (selectedServices.length > 0) setCurrentStep("employee");
  };

  const handleEmployeeSelectForService = (
    serviceId: string,
    employee: Employee,
  ) => {
    setServiceEmployeeAssignments((prev) => ({
      ...prev,
      [serviceId]: employee,
    }));
  };

  const handleEmployeeSelectionDone = () => {
    const allAssigned = selectedServices.every(
      (s) => serviceEmployeeAssignments[s.id],
    );
    if (allAssigned) setCurrentStep("datetime");
    else {
      toast({
        variant: "destructive",
        title: "Atención",
        description: "Por favor asigna un profesional para cada servicio.",
      });
    }
  };

  const handleDateTimeConfirm = () => {
    if (selectedDate && selectedTime) setCurrentStep("details");
  };

  const handleBookingSubmit = async () => {
    if (!authState.user) {
      router.push("/auth/client/login");
      return;
    }
    if (
      selectedServices.length === 0 ||
      !leadEmployee ||
      !selectedDate ||
      !selectedTime ||
      !business
    )
      return;

    const now = new Date();
    const appointmentDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const hoursUntil =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < business.min_booking_hours) {
      toast({
        variant: "destructive",
        title: "No se puede reservar",
        description: `Mínimo ${business.min_booking_hours} horas de anticipación.`,
      });
      return;
    }

    try {
      setSubmitting(true);
      const startTime = selectedTime;
      const startMinutes =
        parseInt(startTime.split(":")[0]) * 60 +
        parseInt(startTime.split(":")[1]);
      const endMinutes = startMinutes + totalDuration;
      const endTime = `${Math.floor(endMinutes / 60)
        .toString()
        .padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

      const { data: appointmentId, error: bookingError } =
        await bookingService.submitAppointment({
          p_business_id: businessId,
          p_client_id: authState.user.id,
          p_employee_id: leadEmployee.id,
          p_appointment_date: formatDateForDB(selectedDate),
          p_start_time: startTime,
          p_end_time: endTime,
          p_total_price: totalPrice,
          p_client_notes: clientNotes || null,
          p_services: selectedServices.map((s) => ({
            service_id: s.id,
            price: s.price,
            employee_id: serviceEmployeeAssignments[s.id]?.id,
          })),
        });

      if (bookingError) {
        if (bookingError.code === "23505") {
          toast({
            variant: "destructive",
            title: "Horario ocupado",
            description: "Por favor elige otro horario.",
          });
          generateTimeSlots();
          setCurrentStep("datetime");
          return;
        }
        throw bookingError;
      }

      await fetch("/api/send-appointment-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      setCurrentStep("confirmation");
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear la cita",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goBackToService = useCallback(() => {
    setCurrentStep("service");
    setSelectedServices([]);
    setServiceEmployeeAssignments({});
    setSelectedDate(undefined);
    setSelectedTime("");
  }, []);

  const goBackToEmployee = useCallback(() => {
    setCurrentStep("employee");
    setSelectedDate(undefined);
    setSelectedTime("");
  }, []);

  const goBackToDateTime = useCallback(() => setCurrentStep("datetime"), []);

  return {
    // State
    business,
    services,
    allEmployees,
    allEmployeeServices,
    loading,
    submitting,
    currentStep,
    selectedServices,
    serviceEmployeeAssignments,
    selectedDate,
    selectedTime,
    availableSlots,
    clientNotes,
    minDate,
    maxDate,
    specialHourForDate,
    checkingSpecialHours,
    isOpenToday,
    bookingStatus,
    checkingBlockStatus,
    loadingEmployees,
    hasEmployees: allEmployees.length > 0,

    // Memos
    totalDuration,
    totalPrice,
    leadEmployee,

    // Setters
    setSelectedDate,
    setSelectedTime,
    setClientNotes,
    setCurrentStep,

    // Handlers
    handleServiceSelect,
    handleContinueToEmployee,
    handleEmployeeSelectForService,
    handleEmployeeSelectionDone,
    handleDateTimeConfirm,
    handleBookingSubmit,
    goBackToService,
    goBackToEmployee,
    goBackToDateTime,
    businessId,
    employees,
  };
}
