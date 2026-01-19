import { useState, useEffect } from "react";
import { getEmployeesForMultipleServices } from "@/lib/employeeServicesApi";

interface Service {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  avatar_url?: string;
}

/**
 * Hook para filtrar empleados según servicios seleccionados
 * Retorna solo empleados que pueden realizar TODOS los servicios
 */
export function useEmployeeFiltering(
  selectedServices: Service[],
  allEmployees: Employee[]
) {
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedServices.length > 0) {
      filterEmployees();
    } else {
      setFilteredEmployees(allEmployees);
    }
  }, [selectedServices, allEmployees]);

  const filterEmployees = async () => {
    try {
      setIsLoading(true);
      const serviceIds = selectedServices.map((s) => s.id);
      const { data, error } = await getEmployeesForMultipleServices(serviceIds);

      if (error) {
        console.error("Error filtering employees:", error);
        setFilteredEmployees(allEmployees);
      } else {
        setFilteredEmployees(data || []);
      }
    } catch (error) {
      console.error("Error filtering employees:", error);
      setFilteredEmployees(allEmployees);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    filteredEmployees,
    isLoading,
    hasNoEmployees:
      filteredEmployees.length === 0 && selectedServices.length > 0,
    filterEmployees,
  };
}
