// ============================================================================
// API FUNCTIONS FOR EMPLOYEE SERVICES
// ============================================================================

import { createClient } from "@/lib/supabaseClient";
import type {
  EmployeeService,
  ServiceWithAssignment,
} from "@/types/employee-services";

/**
 * Obtiene todos los servicios de un empleado
 */
export async function getEmployeeServices(employeeId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("employee_services")
    .select(
      `
      id,
      service_id,
      created_at,
      services (
        id,
        name,
        price,
        duration_minutes
      )
    `
    )
    .eq("employee_id", employeeId);

  if (error) {
    console.error("Error fetching employee services:", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Obtiene todos los servicios del negocio con indicador de asignación
 */
export async function getServicesWithAssignment(
  businessId: string,
  employeeId: string
): Promise<{ data: ServiceWithAssignment[] | null; error: any }> {
  const supabase = createClient();

  // Obtener todos los servicios del negocio
  const { data: allServices, error: servicesError } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", businessId)
    .order("name");

  if (servicesError) {
    console.error("Error fetching services:", servicesError);
    return { data: null, error: servicesError };
  }

  // Obtener servicios asignados al empleado
  const { data: assignedServices, error: assignedError } = await supabase
    .from("employee_services")
    .select("service_id")
    .eq("employee_id", employeeId);

  if (assignedError) {
    console.error("Error fetching assigned services:", assignedError);
    return { data: null, error: assignedError };
  }

  // Crear Set de IDs asignados para búsqueda rápida
  const assignedIds = new Set(assignedServices?.map((s) => s.service_id) || []);

  // Mapear servicios con indicador de asignación
  const servicesWithAssignment: ServiceWithAssignment[] = (
    allServices || []
  ).map((service) => ({
    ...service,
    is_assigned: assignedIds.has(service.id),
  }));

  return { data: servicesWithAssignment, error: null };
}

/**
 * Asigna un servicio a un empleado
 */
export async function assignServiceToEmployee(
  employeeId: string,
  serviceId: string
) {
  const supabase = createClient();

  const { error } = await supabase.from("employee_services").insert({
    employee_id: employeeId,
    service_id: serviceId,
  });

  if (error) {
    console.error("Error assigning service:", error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Desasigna un servicio de un empleado
 */
export async function unassignServiceFromEmployee(
  employeeId: string,
  serviceId: string
) {
  const supabase = createClient();

  const { error } = await supabase
    .from("employee_services")
    .delete()
    .eq("employee_id", employeeId)
    .eq("service_id", serviceId);

  if (error) {
    console.error("Error unassigning service:", error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Actualiza todas las asignaciones de servicios de un empleado
 * Elimina las no seleccionadas y agrega las nuevas
 */
export async function updateEmployeeServices(
  employeeId: string,
  selectedServiceIds: string[]
) {
  const supabase = createClient();

  try {
    // 1. Obtener asignaciones actuales
    const { data: currentAssignments, error: fetchError } = await supabase
      .from("employee_services")
      .select("service_id")
      .eq("employee_id", employeeId);

    if (fetchError) throw fetchError;

    const currentIds = new Set(
      currentAssignments?.map((a) => a.service_id) || []
    );
    const selectedIds = new Set(selectedServiceIds);

    // 2. Determinar qué agregar y qué eliminar
    const toAdd = selectedServiceIds.filter((id) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter(
      (id) => !selectedIds.has(id)
    );

    // 3. Eliminar servicios desasignados
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from("employee_services")
        .delete()
        .eq("employee_id", employeeId)
        .in("service_id", toRemove);

      if (deleteError) throw deleteError;
    }

    // 4. Agregar nuevos servicios
    if (toAdd.length > 0) {
      const { error: insertError } = await supabase
        .from("employee_services")
        .insert(
          toAdd.map((serviceId) => ({
            employee_id: employeeId,
            service_id: serviceId,
          }))
        );

      if (insertError) throw insertError;
    }

    return {
      success: true,
      error: null,
      added: toAdd.length,
      removed: toRemove.length,
    };
  } catch (error) {
    console.error("Error updating employee services:", error);
    return {
      success: false,
      error,
      added: 0,
      removed: 0,
    };
  }
}

/**
 * Cuenta cuántos servicios tiene asignados un empleado
 */
export async function getEmployeeServicesCount(employeeId: string) {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("employee_services")
    .select("*", { count: "exact", head: true })
    .eq("employee_id", employeeId);

  if (error) {
    console.error("Error counting employee services:", error);
    return { count: 0, error };
  }

  return { count: count || 0, error: null };
}

/**
 * Obtiene los empleados que pueden realizar un servicio específico
 */
export async function getEmployeesForService(serviceId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("employee_services")
    .select(
      `
      employee_id,
      employees (
        id,
        first_name,
        last_name,
        position,
        avatar_url,
        is_active
      )
    `
    )
    .eq("service_id", serviceId);

  if (error) {
    console.error("Error fetching employees for service:", error);
    return { data: null, error };
  }

  // Filtrar solo empleados activos y mapear
  const employees = (data || [])
    .map((item: any) => item.employees)
    .filter((emp: any) => emp && emp.is_active);

  return { data: employees, error: null };
}

/**
 * Obtiene empleados que pueden realizar TODOS los servicios especificados
 * (intersección de conjuntos - solo empleados que tienen todos los servicios)
 */
export async function getEmployeesForMultipleServices(serviceIds: string[]) {
  const supabase = createClient();

  if (serviceIds.length === 0) {
    return { data: [], error: null };
  }

  try {
    // Para cada servicio, obtener los IDs de empleados que lo pueden realizar
    const employeesByService = await Promise.all(
      serviceIds.map(async (serviceId) => {
        const { data, error } = await supabase
          .from("employee_services")
          .select("employee_id")
          .eq("service_id", serviceId);

        if (error) {
          console.error(
            `Error fetching employees for service ${serviceId}:`,
            error
          );
          return new Set<string>();
        }

        return new Set((data || []).map((item: any) => item.employee_id));
      })
    );

    // Si algún servicio no tiene empleados, la intersección será vacía
    if (employeesByService.some((set) => set.size === 0)) {
      return { data: [], error: null };
    }

    // Encontrar intersección (empleados que tienen TODOS los servicios)
    let intersection = employeesByService[0];
    for (let i = 1; i < employeesByService.length; i++) {
      intersection = new Set(
        Array.from(intersection).filter((x) => employeesByService[i].has(x))
      );
    }

    // Si no hay empleados en común, retornar vacío
    if (intersection.size === 0) {
      return { data: [], error: null };
    }

    // Obtener detalles completos de los empleados en la intersección
    const { data: employees, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, position, avatar_url")
      .in("id", Array.from(intersection))
      .eq("is_active", true)
      .order("first_name");

    return { data: employees || [], error };
  } catch (error) {
    console.error("Error in getEmployeesForMultipleServices:", error);
    return { data: null, error };
  }
}
