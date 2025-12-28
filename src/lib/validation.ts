import { z } from "zod";

/**
 * ================================================================
 * TUTURNO - CENTRALIZED VALIDATION LIBRARY
 * ================================================================
 *
 * All form validation schemas in ONE place for maximum reusability.
 *
 * Features:
 * - Auto-uppercase transformation for names/lastnames
 * - Phone format validation (no letters allowed)
 * - Email validation
 * - Price format validation
 * - Type-safe exports for TypeScript
 *
 * Usage:
 * import { employeeFormSchema, type EmployeeFormData } from '@/lib/validation'
 *
 * const form = useForm<EmployeeFormData>({
 *   resolver: zodResolver(employeeFormSchema)
 * })
 * ================================================================
 */

// ========================================
// 1. NAME VALIDATION + AUTO-UPPERCASE
// ========================================

/**
 * Base name validation schema
 *
 * Features:
 * - Auto-transforms to UPPERCASE before saving
 * - Trims whitespace
 * - Accepts Spanish characters (áéíóú, ñ, ü)
 * - Only letters and spaces allowed
 *
 * Examples:
 * - Input: "juan" → Output: "JUAN"
 * - Input: "maría josé" → Output: "MARÍA JOSÉ"
 * - Input: "  Pedro  " → Output: "PEDRO"
 */
const nameBaseSchema = z
  .string()
  .min(2, "Debe tener al menos 2 caracteres")
  .max(50, "No puede exceder 50 caracteres")
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, "Solo puede contener letras")
  .transform((val) => val.trim().toUpperCase());

/**
 * First name validation
 * Auto-transforms to UPPERCASE
 */
export const firstNameSchema = nameBaseSchema;

/**
 * Last name validation
 * Auto-transforms to UPPERCASE
 */
export const lastNameSchema = nameBaseSchema;

// ========================================
// 2. PHONE VALIDATION (Ecuador Format)
// ========================================

/**
 * Optional phone validation (Ecuador format)
 *
 * Accepts:
 * - "0999123456" ✅
 * - "0987654321" ✅
 *
 * Rejects:
 * - "abc123" ❌
 * - "1234567890" ❌ (no empieza con 09)
 * - "099912345" ❌ (menos de 10 dígitos)
 * - "09991234567" ❌ (más de 10 dígitos)
 *
 * Requirements:
 * - Exactly 10 digits
 * - Must start with "09"
 */
export const phoneSchema = z
  .string()
  .regex(
    /^09\d{8}$/,
    "Debe ser un teléfono válido de Ecuador (10 dígitos, inicia con 09)"
  )
  .optional()
  .or(z.literal(""));

/**
 * Required phone validation (Ecuador format)
 * Must provide a valid phone number
 *
 * Format: 0999123456 (10 dígitos, inicia con 09)
 */
export const requiredPhoneSchema = z
  .string()
  .min(1, "El teléfono es requerido")
  .regex(
    /^09\d{8}$/,
    "Debe ser un teléfono válido de Ecuador (10 dígitos, inicia con 09)"
  );

// ========================================
// 3. EMAIL VALIDATION
// ========================================

/**
 * Optional email validation
 */
export const emailSchema = z
  .string()
  .email("Formato de email inválido")
  .optional()
  .or(z.literal(""));

/**
 * Required email validation
 */
export const requiredEmailSchema = z
  .string()
  .min(1, "El email es requerido")
  .email("Ingresa un email válido");

// ========================================
// 4. PRICE VALIDATION
// ========================================

/**
 * Price validation (string format)
 *
 * Accepts:
 * - "10" ✅
 * - "10.50" ✅
 * - "25.99" ✅
 *
 * Rejects:
 * - "abc" ❌
 * - "10.999" ❌ (max 2 decimals)
 * - "-5" ❌ (negative)
 */
export const priceSchema = z
  .string()
  .min(1, "El precio es requerido")
  .regex(/^\d+(\.\d{1,2})?$/, "Precio inválido (ej: 10.50 o 25)");

/**
 * Numeric price validation
 */
export const numericPriceSchema = z
  .number()
  .positive("El precio debe ser mayor a 0")
  .max(999999.99, "El precio es demasiado alto");

// ========================================
// 5. TIME & DATE VALIDATION
// ========================================

/**
 * Time validation (HH:MM format)
 * Examples: "09:00", "14:30", "23:59"
 */
export const timeSchema = z
  .string()
  .regex(
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    "Formato de hora inválido (HH:MM)"
  );

/**
 * Date validation (YYYY-MM-DD format)
 * Example: "2025-12-31"
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");

// ========================================
// 6. PASSWORD VALIDATION
// ========================================

/**
 * Password validation
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 lowercase letter
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Debe contener al menos: 1 minúscula, 1 mayúscula y 1 número"
  );

/**
 * Password with confirmation validation
 */
export const passwordWithConfirmation = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// ========================================
// 7. TEXT FIELDS VALIDATION
// ========================================

/**
 * Short text field (max 100 chars)
 * Use for: position, title, short descriptions
 */
export const shortTextSchema = z
  .string()
  .max(100, "No puede exceder 100 caracteres")
  .optional();

/**
 * Medium text field (max 500 chars)
 * Use for: bio, descriptions
 */
export const mediumTextSchema = z
  .string()
  .max(500, "No puede exceder 500 caracteres")
  .optional();

/**
 * Long text field (max 2000 chars)
 * Use for: notes, detailed descriptions
 */
export const longTextSchema = z
  .string()
  .max(2000, "No puede exceder 2000 caracteres")
  .optional();

// ========================================
// 8. BUSINESS SETTINGS VALIDATION
// ========================================

/**
 * Business name validation
 * Required field for business profile
 */
export const businessNameSchema = z
  .string()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(100, "El nombre no puede exceder 100 caracteres");

/**
 * Website URL validation (optional)
 * Accepts valid URLs or empty string
 */
export const websiteSchema = z
  .string()
  .url("Formato de URL inválido")
  .optional()
  .or(z.literal(""));

/**
 * Address validation (optional)
 * Free text field for business address
 */
export const addressSchema = z.string().optional();

/**
 * Business information schema
 * Used in business settings/profile page
 *
 * Features:
 * ✅ Business name required
 * ✅ Phone format validated (Ecuador)
 * ✅ Email format validated
 * ✅ Website URL validated
 * ✅ Address optional
 *
 * Usage:
 * import { businessInfoSchema, type BusinessInfoData } from '@/lib/validation'
 */
export const businessInfoSchema = z.object({
  name: businessNameSchema,
  description: mediumTextSchema,
  phone: phoneSchema,
  email: emailSchema,
  website: websiteSchema,
  address: addressSchema,
  business_category_id: z.string().min(1, "Selecciona una categoría"),
});

/**
 * Advanced business settings schema
 * Used in advanced settings page
 *
 * Features:
 * ✅ Cancellation policies
 * ✅ Booking restrictions
 * ✅ Reminder settings
 * ✅ Deposit requirements
 * ✅ Auto-confirm appointments
 *
 * Usage:
 * import { advancedSettingsSchema, type AdvancedSettingsData } from '@/lib/validation'
 */
export const advancedSettingsSchema = z.object({
  cancellation_policy_hours: z
    .number()
    .min(0, "Mínimo 0 horas")
    .max(168, "Máximo 168 horas (7 días)"),
  cancellation_policy_text: z.string().max(500, "Máximo 500 caracteres"),
  allow_client_cancellation: z.boolean(),
  allow_client_reschedule: z.boolean(),
  min_booking_hours: z
    .number()
    .min(0, "Mínimo 0 horas")
    .max(72, "Máximo 72 horas (3 días)"),
  max_booking_days: z
    .number()
    .min(1, "Mínimo 1 día")
    .max(365, "Máximo 365 días (1 año)"),
  enable_reminders: z.boolean(),
  reminder_hours_before: z
    .number()
    .min(1, "Mínimo 1 hora")
    .max(168, "Máximo 168 horas (7 días)"),
  reminder_email_enabled: z.boolean(),
  reminder_sms_enabled: z.boolean(),
  reminder_push_enabled: z.boolean(),
  require_deposit: z.boolean(),
  deposit_percentage: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
  auto_confirm_appointments: z.boolean(),
});

// ========================================
// 9. COMPOSITE SCHEMAS (REUSABLE)
// ========================================

/**
 * Full name schema (first + last name)
 * Both names auto-transform to UPPERCASE
 */
export const fullNameSchema = z.object({
  first_name: firstNameSchema,
  last_name: lastNameSchema,
});

/**
 * Contact information schema
 * Email + Phone validation
 */
export const contactInfoSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
});

/**
 * Employee form schema (Create/Edit)
 *
 * Features:
 * ✅ Names auto-uppercase
 * ✅ Phone format validated (no letters)
 * ✅ ALL fields REQUIRED (cannot save until filled)
 *
 * Usage:
 * import { employeeFormSchema, type EmployeeFormData } from '@/lib/validation'
 *
 * const form = useForm<EmployeeFormData>({
 *   resolver: zodResolver(employeeFormSchema),
 *   mode: 'onChange' // Real-time validation
 * })
 */
export const employeeFormSchema = z.object({
  first_name: firstNameSchema,
  last_name: lastNameSchema,
  email: requiredEmailSchema, // ✅ REQUERIDO
  phone: requiredPhoneSchema, // ✅ REQUERIDO
  position: z
    .string()
    .min(1, "La posición es requerida")
    .max(100, "Máximo 100 caracteres"), // ✅ REQUERIDO
  bio: mediumTextSchema,
  is_active: z.boolean(),
});

/**
 * Service form schema (Create/Edit)
 *
 * Features:
 * ✅ Price format validated (10.50 or 10)
 * ✅ All fields required before submit
 *
 * Usage:
 * import { serviceFormSchema, type ServiceFormData } from '@/lib/validation'
 */
export const serviceFormSchema = z.object({
  name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  description: z.string().optional().or(z.literal("")),
  price: priceSchema,
  duration_minutes: z.string().min(1, "La duración es requerida"),
  is_active: z.boolean(),
});

/**
 * Business client form schema (Create/Edit)
 *
 * Features:
 * ✅ Names auto-uppercase
 * ✅ At least ONE contact method required (phone OR email)
 * ✅ Cannot submit until valid
 *
 * Usage:
 * import { clientFormSchema, type ClientFormData } from '@/lib/validation'
 */
export const clientFormSchema = z
  .object({
    first_name: firstNameSchema,
    last_name: lastNameSchema,
    email: emailSchema,
    phone: phoneSchema,
    notes: longTextSchema,
    is_active: z.boolean(),
  })
  .refine(
    (data) => {
      // Al menos uno de los dos debe tener valor
      const hasPhone = data.phone && data.phone.trim().length > 0;
      const hasEmail = data.email && data.email.trim().length > 0;
      return hasPhone || hasEmail;
    },
    {
      message:
        "Debe proporcionar al menos un método de contacto (teléfono o email)",
      path: ["phone"], // Mostrar error en el campo phone
    }
  );

/**
 * Walk-in client schema (Appointment modal)
 *
 * Features:
 * ✅ Name auto-uppercase
 * ✅ Phone optional but validated if provided
 *
 * Usage:
 * import { walkInClientSchema, type WalkInClientData } from '@/lib/validation'
 */
export const walkInClientSchema = z.object({
  walk_in_client_name: firstNameSchema,
  walk_in_client_phone: phoneSchema,
});

// ========================================
// 9. TYPE EXPORTS (For TypeScript)
// ========================================

/**
 * TypeScript types inferred from schemas
 * Use these for type-safe form handling
 *
 * Example:
 * import { type EmployeeFormData } from '@/lib/validation'
 *
 * const form = useForm<EmployeeFormData>({...})
 */

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;
export type ServiceFormData = z.infer<typeof serviceFormSchema>;
export type ClientFormData = z.infer<typeof clientFormSchema>;
export type WalkInClientData = z.infer<typeof walkInClientSchema>;
export type FullNameData = z.infer<typeof fullNameSchema>;
export type ContactInfoData = z.infer<typeof contactInfoSchema>;
export type BusinessInfoData = z.infer<typeof businessInfoSchema>;
export type AdvancedSettingsData = z.infer<typeof advancedSettingsSchema>;

// ========================================
// 10. USAGE EXAMPLES (Documentation)
// ========================================

/**
 * EXAMPLE 1: Employee Form
 *
 * import { useForm } from 'react-hook-form'
 * import { zodResolver } from '@hookform/resolvers/zod'
 * import { employeeFormSchema, type EmployeeFormData } from '@/lib/validation'
 *
 * const {
 *   register,
 *   handleSubmit,
 *   formState: { errors, isValid }
 * } = useForm<EmployeeFormData>({
 *   resolver: zodResolver(employeeFormSchema),
 *   mode: 'onChange' // Real-time validation
 * })
 *
 * const onSubmit = async (data: EmployeeFormData) => {
 *   // data.first_name is already UPPERCASE
 *   // data.phone is already validated (no letters)
 *   await saveEmployee(data)
 * }
 *
 * return (
 *   <form onSubmit={handleSubmit(onSubmit)}>
 *     <Input {...register('first_name')} />
 *     {errors.first_name && <p>{errors.first_name.message}</p>}
 *
 *     <Button type="submit" disabled={!isValid}>
 *       Guardar
 *     </Button>
 *   </form>
 * )
 */

/**
 * EXAMPLE 2: Individual Field Validation
 *
 * import { phoneSchema } from '@/lib/validation'
 *
 * const validatePhone = (phone: string) => {
 *   try {
 *     phoneSchema.parse(phone)
 *     return true
 *   } catch (error) {
 *     return false
 *   }
 * }
 */

/**
 * EXAMPLE 3: Transform Name to Uppercase
 *
 * import { firstNameSchema } from '@/lib/validation'
 *
 * const name = "juan"
 * const transformed = firstNameSchema.parse(name) // "JUAN"
 */
