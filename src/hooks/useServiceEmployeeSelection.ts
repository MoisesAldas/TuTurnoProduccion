import { useState, useEffect, useCallback } from "react";
import { getEmployeesForService } from "@/lib/employeeServicesApi";
import type { ServiceEmployeePair, Service, Employee } from "@/types/booking";

/**
 * Hook para manejar la selección inteligente de servicios con empleados
 * Maneja compatibilidad, filtrado dinámico y asignación de empleados
 */
export function useServiceEmployeeSelection(allServices: Service[]) {
  const [pairs, setPairs] = useState<ServiceEmployeePair[]>([]);
  const [loading, setLoading] = useState(false);

  // Inicializar pairs cuando cambian los servicios
  useEffect(() => {
    initializePairs();
  }, [allServices]);

  const initializePairs = async () => {
    setLoading(true);
    const initialPairs: ServiceEmployeePair[] = await Promise.all(
      allServices.map(async (service) => {
        const { data: employees } = await getEmployeesForService(service.id);
        return {
          service,
          employee: null,
          employees: employees || [],
          isSelected: false,
          isCompatible: true,
          disabledReason: undefined,
        };
      })
    );
    setPairs(initialPairs);
    setLoading(false);
  };

  // Verificar compatibilidad de un servicio con los ya seleccionados
  const checkCompatibility = useCallback(
    (
      serviceId: string,
      selectedPairs: ServiceEmployeePair[]
    ): { isCompatible: boolean; reason?: string } => {
      if (selectedPairs.length === 0) {
        return { isCompatible: true };
      }

      // Obtener empleados de los servicios ya seleccionados
      const selectedEmployeeIds = new Set(
        selectedPairs.filter((p) => p.employee).map((p) => p.employee!.id)
      );

      if (selectedEmployeeIds.size === 0) {
        return { isCompatible: true };
      }

      // Obtener empleados del servicio que se quiere agregar
      const servicePair = pairs.find((p) => p.service.id === serviceId);
      if (!servicePair) {
        return { isCompatible: false, reason: "Servicio no encontrado" };
      }

      const serviceEmployeeIds = new Set(
        servicePair.employees.map((e) => e.id)
      );

      // Verificar si hay intersección (al menos un empleado en común)
      const hasCommonEmployee = Array.from(selectedEmployeeIds).some((id) =>
        serviceEmployeeIds.has(id)
      );

      if (!hasCommonEmployee) {
        const selectedServiceNames = selectedPairs
          .map((p) => p.service.name)
          .join(", ");
        return {
          isCompatible: false,
          reason: `Este servicio requiere un empleado diferente. Deselecciona "${selectedServiceNames}" para agregarlo.`,
        };
      }

      return { isCompatible: true };
    },
    [pairs]
  );

  // Actualizar compatibilidad de todos los servicios
  const updateCompatibility = useCallback(() => {
    const selectedPairs = pairs.filter((p) => p.isSelected);

    setPairs((prevPairs) =>
      prevPairs.map((pair) => {
        if (pair.isSelected) {
          return { ...pair, isCompatible: true, disabledReason: undefined };
        }

        const { isCompatible, reason } = checkCompatibility(
          pair.service.id,
          selectedPairs
        );
        return {
          ...pair,
          isCompatible,
          disabledReason: reason,
        };
      })
    );
  }, [pairs, checkCompatibility]);

  // Seleccionar/deseleccionar servicio
  const toggleService = useCallback((serviceId: string) => {
    setPairs((prevPairs) => {
      const newPairs = prevPairs.map((pair) => {
        if (pair.service.id === serviceId) {
          return {
            ...pair,
            isSelected: !pair.isSelected,
            // Si se deselecciona, limpiar empleado
            employee: pair.isSelected ? null : pair.employee,
          };
        }
        return pair;
      });
      return newPairs;
    });
  }, []);

  // Asignar empleado a un servicio
  const assignEmployee = useCallback(
    (serviceId: string, employee: Employee) => {
      setPairs((prevPairs) =>
        prevPairs.map((pair) => {
          if (pair.service.id === serviceId) {
            return { ...pair, employee };
          }
          return pair;
        })
      );
    },
    []
  );

  // Actualizar compatibilidad cuando cambian las selecciones
  useEffect(() => {
    updateCompatibility();
  }, [pairs.filter((p) => p.isSelected).length]);

  // Obtener servicios seleccionados con empleados
  const getSelectedPairs = useCallback(() => {
    return pairs.filter((p) => p.isSelected && p.employee);
  }, [pairs]);

  // Verificar si se puede continuar (todos los servicios seleccionados tienen empleado)
  const canProceed = useCallback(() => {
    const selectedPairs = pairs.filter((p) => p.isSelected);
    return (
      selectedPairs.length > 0 &&
      selectedPairs.every((p) => p.employee !== null)
    );
  }, [pairs]);

  return {
    pairs,
    loading,
    toggleService,
    assignEmployee,
    getSelectedPairs,
    canProceed,
  };
}
