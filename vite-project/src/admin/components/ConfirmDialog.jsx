import Modal from '../../components/Modal.jsx';

const ConfirmDialog = ({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }) => {
  return (
    <Modal open={open} onClose={onCancel} eyebrow="✦ CONFIRM ✦" title={title}>
      <div className="flex flex-col gap-6 p-7">
        <p className="text-[0.92rem] leading-[1.7] text-text-secondary">{message}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-gold-400/25 bg-transparent px-5 py-2.5 text-[0.85rem] text-text-secondary transition-all hover:border-gold-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="cursor-pointer rounded-lg border border-ruby-500 bg-ruby-500/20 px-5 py-2.5 text-[0.85rem] font-semibold text-ruby-500 transition-all hover:bg-ruby-500 hover:text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
