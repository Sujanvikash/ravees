import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Button from './Button.jsx';
import FormField from './FormField.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SHOWROOMS } from '../data/showrooms.js';
import { Input, Select, Textarea } from './Input.jsx';

const HEIGHT_OPTIONS = [
  { value: '6-7.5ft', label: '6ft – 7.5ft (Standard Living Room)' },
  { value: '9-12ft', label: '9ft – 12ft (High Ceiling / Villa)' },
  { value: 'Commercial', label: '15ft+ (Commercial / Church)' },
  { value: 'LightsDecor', label: 'Lights & Ornaments Only' },
];

export default function ConsultForm({ onSubmitted }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    showroom: 'Chennai',
    height: '6-7.5ft',
    notes: '',
  });

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitted?.({ ...form, type: 'consultation' });
    showToast(`Thank you, ${form.name}! Your consultation for ${form.showroom} has been requested.`);
    setForm({ name: '', phone: '', showroom: 'Chennai', height: '6-7.5ft', notes: '' });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <FormField label="Your Name" htmlFor="consult-name">
          <Input
            id="consult-name"
            type="text"
            required
            placeholder="e.g. David Thomas"
            value={form.name}
            onChange={update('name')}
          />
        </FormField>
        <FormField label="Phone / WhatsApp Number" htmlFor="consult-phone">
          <Input
            id="consult-phone"
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={update('phone')}
          />
        </FormField>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <FormField label="Preferred Showroom" htmlFor="consult-showroom">
          <Select
            id="consult-showroom"
            value={form.showroom}
            onChange={update('showroom')}
          >
            {SHOWROOMS.map((room) => (
              <option key={room.city} value={room.city} className="bg-bg-dark-emerald">
                {room.city}
                {room.isFlagship ? ' (Flagship)' : ''}
              </option>
            ))}
            <option value="Online" className="bg-bg-dark-emerald">
              Online Delivery Only
            </option>
          </Select>
        </FormField>
        <FormField label="Tree Height Interest" htmlFor="consult-height">
          <Select
            id="consult-height"
            value={form.height}
            onChange={update('height')}
          >
            {HEIGHT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-dark-emerald">
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Special Requests / Notes" htmlFor="consult-notes">
        <Textarea
          id="consult-notes"
          rows="3"
          placeholder="Tell us about your home layout or decor preferences..."
          value={form.notes}
          onChange={update('notes')}
        />
      </FormField>

      <Button type="submit" full>
        <span>Submit Consultation Request</span>
        <ArrowRight size={18} strokeWidth={2} />
      </Button>
    </form>
  );
}
