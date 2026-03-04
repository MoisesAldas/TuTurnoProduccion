import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { createClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { toDateString } from "@/lib/dateUtils";
import type { Employee, Service, Appointment } from "@/types/database";

export type ClientType = "registered" | "business_client" | "walk_in";

export interface Client {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
}

export interface BusinessClient {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

interface UseCreateAppointmentProps {
  businessId: string;
  selectedDate: Date;
  selectedTime?: string;
  selectedEmployeeId?: string;
  appointment?: Appointment;
  onClose: () => void;
  onSuccess: () => void;
}

export function useCreateAppointment({
  businessId,
  selectedDate,
  selectedTime,
  selectedEmployeeId,
  appointment,
  onClose,
  onSuccess,
}: UseCreateAppointmentProps) {
  const supabase = createClient();
  const { toast } = useToast();

  // --- Data States ---
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [businessClients, setBusinessClients] = useState<BusinessClient[]>([]);

  // --- UI States ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRegisteredDropdown, setShowRegisteredDropdown] = useState(false);
  const [showBusinessClientDropdown, setShowBusinessClientDropdown] =
    useState(false);

  // --- Form States ---
  const [clientType, setClientType] = useState<ClientType>("walk_in");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBusinessClientId, setSelectedBusinessClientId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");

  // Per-service employee assignments
  const [serviceAssignments, setServiceAssignments] = useState<
    Record<string, string>
  >({});

  const [appointmentDate, setAppointmentDate] = useState(
    toDateString(selectedDate),
  );
  const [startTime, setStartTime] = useState(selectedTime || "09:00");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [clientNotes, setClientNotes] = useState("");

  const totalSteps = 4;

  // --- Memos ---
  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        `${client.first_name} ${client.last_name} ${client.phone || ""} ${client.email || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [clients, searchTerm],
  );

  const totalPrice = useMemo(() => {
    return selectedServiceIds.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
  }, [selectedServiceIds, services]);

  const totalDuration = useMemo(() => {
    return selectedServiceIds.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      return total + (service?.duration_minutes || 0);
    }, 0);
  }, [selectedServiceIds, services]);

  const endTime = useMemo(() => {
    if (!startTime || selectedServiceIds.length === 0) return "";
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    startDate.setMinutes(startDate.getMinutes() + totalDuration);
    return startDate.toTimeString().substring(0, 5);
  }, [startTime, totalDuration, selectedServiceIds.length]);

  const leadEmployeeId = useMemo(() => {
    if (selectedServiceIds.length === 0) return selectedEmployeeId || "";
    const firstServiceId = selectedServiceIds[0];
    return serviceAssignments[firstServiceId] || selectedEmployeeId || "";
  }, [selectedServiceIds, serviceAssignments, selectedEmployeeId]);

  // --- Actions ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: emps }, { data: srvs }, { data: apts }, { data: bcs }] =
        await Promise.all([
          supabase
            .from("employees")
            .select("id, first_name, last_name, is_active")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("first_name"),
          supabase
            .from("services")
            .select("id, name, price, duration_minutes, is_active")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("name"),
          supabase
            .from("appointments")
            .select(
              "client_id, users!appointments_client_id_fkey(id, first_name, last_name, phone, email)",
            )
            .eq("business_id", businessId)
            .not("client_id", "is", null)
            .limit(200),
          supabase.rpc("list_business_clients", {
            p_business_id: businessId,
            p_search: null,
            p_only_active: true,
            p_limit: 50,
            p_offset: 0,
            p_sort_by: "first_name",
            p_sort_dir: "asc",
          }),
        ]);

      setEmployees((emps as any) || []);
      setServices((srvs as any) || []);

      if (apts) {
        const uniqueClients = Array.from(
          new Map(
            apts
              .filter((a: any) => a.users)
              .map((a: any) => [a.users.id, a.users]),
          ).values(),
        ) as Client[];
        setClients(uniqueClients);
      }
      setBusinessClients((bcs as any) || []);
    } finally {
      setLoading(false);
    }
  }, [businessId, supabase]);

  const debouncedSearch = useDebouncedCallback(async (val: string) => {
    const { data } = await supabase.rpc("list_business_clients", {
      p_business_id: businessId,
      p_search: val.trim() || null,
      p_only_active: true,
      p_limit: 50,
      p_offset: 0,
      p_sort_by: "first_name",
      p_sort_dir: "asc",
    });
    setBusinessClients((data as any) || []);
  }, 300);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const isSelected = prev.includes(serviceId);
      if (isSelected) {
        const next = prev.filter((id) => id !== serviceId);
        setServiceAssignments((assignments) => {
          const { [serviceId]: _, ...rest } = assignments;
          return rest;
        });
        return next;
      } else {
        const next = [...prev, serviceId];
        if (!serviceAssignments[serviceId]) {
          setServiceAssignments((prev) => ({
            ...prev,
            [serviceId]: selectedEmployeeId || employees[0]?.id || "",
          }));
        }
        return next;
      }
    });
  };

  const assignEmployeeToService = (serviceId: string, employeeId: string) => {
    setServiceAssignments((prev) => ({ ...prev, [serviceId]: employeeId }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return clientType === "registered"
          ? !!selectedClientId
          : clientType === "business_client"
            ? !!selectedBusinessClientId
            : !!walkInName.trim();
      case 2:
        const allAssigned = selectedServiceIds.every(
          (id) => serviceAssignments[id],
        );
        return selectedServiceIds.length > 0 && allAssigned;
      case 3:
        return !!appointmentDate && !!startTime;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    try {
      setSubmitting(true);
      const appointmentData: any = {
        business_id: businessId,
        employee_id: leadEmployeeId,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        total_price: totalPrice,
        notes: notes || null,
        client_notes: clientNotes || null,
      };

      if (!appointment) appointmentData.status = "confirmed";

      if (clientType === "registered") {
        appointmentData.client_id = selectedClientId;
      } else if (clientType === "business_client") {
        appointmentData.business_client_id = selectedBusinessClientId;
      } else {
        appointmentData.walk_in_client_name = walkInName.trim();
        appointmentData.walk_in_client_phone = walkInPhone.trim() || null;
      }

      let appointmentId: string;
      if (appointment) {
        const { error } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", appointment.id);
        if (error) throw error;
        appointmentId = appointment.id;

        const hasChanges =
          appointment.appointment_date !== appointmentDate ||
          appointment.start_time.substring(0, 5) !== startTime ||
          appointment.employee_id !== leadEmployeeId;
        if (hasChanges) {
          await supabase
            .from("appointments")
            .update({ status: "pending" })
            .eq("id", appointment.id);
          try {
            await fetch("/api/send-rescheduled-notification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                appointmentId: appointment.id,
                changes: {
                  oldDate:
                    appointment.appointment_date !== appointmentDate
                      ? appointment.appointment_date
                      : undefined,
                  oldTime:
                    appointment.start_time.substring(0, 5) !== startTime
                      ? appointment.start_time
                      : undefined,
                  oldEmployeeId:
                    appointment.employee_id !== leadEmployeeId
                      ? appointment.employee_id
                      : undefined,
                },
              }),
            });
          } catch (e) {
            console.error("Email error", e);
          }
        }
        await supabase
          .from("appointment_services")
          .delete()
          .eq("appointment_id", appointment.id);
      } else {
        const { data: created, error } = await supabase
          .from("appointments")
          .insert(appointmentData)
          .select()
          .single();
        if (error) throw error;
        appointmentId = created.id;
      }

      const servicesToInsert = selectedServiceIds.map((sid) => ({
        appointment_id: appointmentId,
        service_id: sid,
        price: services.find((s) => s.id === sid)?.price || 0,
        employee_id: serviceAssignments[sid],
      }));

      const { error: srvErr } = await supabase
        .from("appointment_services")
        .insert(servicesToInsert);
      if (srvErr) throw srvErr;

      if (!appointment && clientType !== "walk_in") {
        fetch("/api/send-appointment-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId }),
        }).catch((e) => console.warn("Confirmation email failed", e));
      }

      toast({
        title: appointment ? "¡Actualizada!" : "¡Creada!",
        description: "Operación exitosa.",
      });
      setTimeout(() => onSuccess(), 1000);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo completar la operación.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Initialization ---
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (appointment) {
      if (appointment.status === "pending") {
        toast({
          variant: "destructive",
          title: "Bloqueado",
          description: "No se puede editar una cita pendiente.",
        });
        onClose();
        return;
      }
      if (appointment.client_id) {
        setClientType("registered");
        setSelectedClientId(appointment.client_id);
      } else if ((appointment as any).business_client_id) {
        setClientType("business_client");
        setSelectedBusinessClientId((appointment as any).business_client_id);
      } else {
        setClientType("walk_in");
        setWalkInName(appointment.walk_in_client_name || "");
        setWalkInPhone(appointment.walk_in_client_phone || "");
      }

      setAppointmentDate(appointment.appointment_date);
      setStartTime(appointment.start_time.substring(0, 5));
      setNotes(appointment.notes || "");
      setClientNotes(appointment.client_notes || "");

      if (appointment.appointment_services) {
        const ids = appointment.appointment_services.map((s) => s.service_id);
        setSelectedServiceIds(ids);
        const mappings: Record<string, string> = {};
        appointment.appointment_services.forEach((s) => {
          mappings[s.service_id] = s.employee_id || appointment.employee_id;
        });
        setServiceAssignments(mappings);
      }
    }
  }, [appointment]);

  return {
    state: {
      employees,
      services,
      clients,
      businessClients,
      loading,
      submitting,
      currentStep,
      clientType,
      selectedClientId,
      selectedBusinessClientId,
      walkInName,
      walkInPhone,
      appointmentDate,
      startTime,
      selectedServiceIds,
      notes,
      clientNotes,
      totalSteps,
      filteredClients,
      totalPrice,
      totalDuration,
      endTime,
      searchTerm,
      showRegisteredDropdown,
      showBusinessClientDropdown,
      serviceAssignments,
    },
    actions: {
      setCurrentStep,
      setClientType,
      setSelectedClientId,
      setSelectedBusinessClientId,
      setWalkInName,
      setWalkInPhone,
      setAppointmentDate,
      setStartTime,
      setNotes,
      setClientNotes,
      setSearchTerm,
      setShowRegisteredDropdown,
      setShowBusinessClientDropdown,
      toggleService,
      assignEmployeeToService,
      handleSubmit,
      handleNext: () =>
        validateStep(currentStep)
          ? setCurrentStep((p) => Math.min(p + 1, totalSteps))
          : toast({
              variant: "destructive",
              title: "Incompleto",
              description: "Llena los campos obligatorios.",
            }),
      handlePrevious: () => setCurrentStep((p) => Math.max(p - 1, 1)),
      debouncedSearch,
    },
  };
}
