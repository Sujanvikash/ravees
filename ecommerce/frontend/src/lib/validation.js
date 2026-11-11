import { z } from 'zod';

/**
 * Zod schemas for the storefront forms, plus `validate`, which every form's submit handler calls.
 * The inputs keep `required` / `type="email"` for their meaning (screen readers, mobile keyboards), but
 * the forms set `noValidate`, so these messages show under the fields instead of the browser's bubbles.
 */

/** Runs `schema` on `data`. Returns { data } (trimmed, ready to save) or { errors: { field: message } }. */
export const validate = (schema, data) => {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data };
  const errors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (key !== undefined && !errors[key]) errors[key] = issue.message;
  }
  return { errors };
};

/** Focuses the first field with an error, if its id is `${prefix}-${key}` (the forms' id convention). */
export const focusFirstError = (errors, prefix) => {
  const key = Object.keys(errors)[0];
  if (key) document.getElementById(`${prefix}-${key}`)?.focus();
};

// Indian mobile: 10 digits starting 6–9, with an optional +91 / 91 / 0 in front. Spaces, dashes and
// brackets are ignored, so "+91 98765 43210" and "098765-43210" both pass.
const INDIAN_MOBILE = /^(?:\+?91|0)?[6-9]\d{9}$/;

const requiredText = (message, min = 1) => z.string().trim().min(min, message);

const name = requiredText('Please enter your name').pipe(z.string().min(2, 'Name looks too short').max(80, 'Name is too long'));
const email = requiredText('Please enter your email').pipe(z.email('Enter a valid email address'));
const phone = requiredText('Please enter your phone number').refine(
  (value) => INDIAN_MOBILE.test(value.replace(/[\s()-]/g, '')),
  'Enter a valid 10-digit mobile number',
);

const notes = z.string().trim().max(1000, 'Please keep notes under 1000 characters');

// Passwords: at least 8 characters (the shop API's rule).
const newPassword = z.string().min(1, 'Please choose a password').min(8, 'Use at least 8 characters');
const confirmMatches = (d) => d.confirm === '' || d.password === d.confirm;

/** The delivery address of an order paid online. */
export const deliverySchema = z.object({
  name,
  phone,
  email,
  line1: requiredText('Please enter the house number and street').pipe(z.string().min(4, 'Please add a little more detail')),
  line2: z.string().trim().max(200, 'Please keep this under 200 characters'),
  city: requiredText('Please enter your city').pipe(z.string().min(2, 'City looks too short')),
  state: requiredText('Please enter your state').pipe(z.string().min(2, 'State looks too short')),
  pincode: requiredText('Please enter the pincode').refine((v) => /^[1-9]\d{5}$/.test(v.replace(/\s/g, '')), 'Enter a valid 6-digit pincode'),
  notes,
});

/** The styling consultation form on the Contact page. */
export const consultSchema = z.object({
  name,
  email,
  phone,
  showroom: z.string(),
  height: z.string(),
  notes,
});

export const signupSchema = z
  .object({
    name,
    email,
    phone,
    password: newPassword,
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine(confirmMatches, { path: ['confirm'], message: 'Passwords do not match' });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Please enter your password'),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirm: z.string().min(1, 'Please confirm your new password'),
  })
  .refine(confirmMatches, { path: ['confirm'], message: 'Passwords do not match' });

export const profileSchema = z.object({ name, phone });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, 'Please enter your current password'),
    password: newPassword,
    confirm: z.string().min(1, 'Please confirm your new password'),
  })
  .refine(confirmMatches, { path: ['confirm'], message: 'Passwords do not match' });
