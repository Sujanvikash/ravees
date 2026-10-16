import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext.jsx';
import { focusFirstError, validate } from '../lib/validation.js';

/**
 * The shared state and submit flow of the sign-in and sign-up forms: validate with `schema`, call
 * `submit(data)` (login or signup), then greet with `welcome(data)` and go back to where the customer
 * came from, or show the error. `idPrefix` is the forms' field-id prefix, for focusing the first error.
 */
export const useAuthForm = ({ initial, schema, idPrefix, submit, welcome }) => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Editing a field clears its error; the rest stay until the next submit.
  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { data, errors } = validate(schema, form);
    if (errors) {
      setFieldErrors(errors);
      focusFirstError(errors, idPrefix);
      return;
    }

    setSubmitting(true);
    const result = await submit(data);
    setSubmitting(false);
    if (result.ok) {
      showToast(welcome(data));
      navigate(location.state?.from ?? '/account');
    } else {
      setError(result.error);
    }
  };

  return { form, update, error, fieldErrors, submitting, handleSubmit };
};
