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

export const checkoutSchema = z
  .object({
    name,
    phone,
    email,
    city: requiredText('Please enter your city').pipe(z.string().min(2, 'City looks too short')),
    address: z.string().trim(),
    fulfilment: z.enum(['delivery', 'pickup']),
    showroom: z.string(),
    timeline: z.string(),
    notes: z.string().trim().max(1000, 'Please keep notes under 1000 characters'),
  })
  .refine((d) => d.fulfilment === 'pickup' || d.address.length > 0, {
    path: ['address'],
    message: 'Please enter your delivery address',
  })
  .refine((d) => d.fulfilment === 'pickup' || d.address.length === 0 || d.address.length >= 10, {
    path: ['address'],
    message: 'Please add a little more detail (street, area, pincode)',
  });

export const signupSchema = z
  .object({
    name,
    email,
    phone,
    password: z.string().min(1, 'Please choose a password').min(6, 'Use at least 6 characters'),
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.confirm === '' || d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Please enter your password'),
});
