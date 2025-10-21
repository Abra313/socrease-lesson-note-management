// Modal System for LNMS
export class Modal {
    constructor() {
        this.createModalContainer();
    }

    createModalContainer() {
        if (document.getElementById('globalModal')) return;

        const modalHTML = `
            <div id="globalModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modalTitle">Modal Title</h2>
                        <span class="modal-close" id="modalClose">
                            <i class="fas fa-times"></i>
                        </span>
                    </div>
                    <div class="modal-body" id="modalBody">
                        Modal content goes here
                    </div>
                    <div class="modal-footer" id="modalFooter" style="display: none;">
                        <!-- Footer buttons will be added dynamically -->
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Close modal on X click
        document.getElementById('modalClose').addEventListener('click', () => {
            this.close();
        });

        // Close modal on outside click
        document.getElementById('globalModal').addEventListener('click', (e) => {
            if (e.target.id === 'globalModal') {
                this.close();
            }
        });

        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    show(options = {}) {
        const {
            title = 'Notification',
            body = '',
            footer = null,
            size = 'medium' // small, medium, large
        } = options;

        const modal = document.getElementById('globalModal');
        const modalContent = modal.querySelector('.modal-content');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');

        // Set size
        modalContent.style.maxWidth = size === 'small' ? '400px' : size === 'large' ? '900px' : '600px';

        // Set content
        modalTitle.textContent = title;
        modalBody.innerHTML = body;

        // Set footer
        if (footer) {
            modalFooter.style.display = 'block';
            modalFooter.innerHTML = footer;
        } else {
            modalFooter.style.display = 'none';
        }

        // Show modal
        modal.classList.add('active');
    }

    close() {
        const modal = document.getElementById('globalModal');
        modal.classList.remove('active');
    }

    confirm(options = {}) {
        const {
            title = 'Confirm',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            onConfirm = () => {},
            onCancel = () => {}
        } = options;

        const footer = `
            <button class="btn-primary" id="confirmBtn">${confirmText}</button>
            <button class="btn-outline" id="cancelBtn">${cancelText}</button>
        `;

        this.show({
            title,
            body: `<p>${message}</p>`,
            footer,
            size: 'small'
        });

        // Add event listeners
        setTimeout(() => {
            document.getElementById('confirmBtn')?.addEventListener('click', () => {
                onConfirm();
                this.close();
            });

            document.getElementById('cancelBtn')?.addEventListener('click', () => {
                onCancel();
                this.close();
            });
        }, 100);
    }

    alert(options = {}) {
        const {
            title = 'Alert',
            message = '',
            type = 'info', // success, error, warning, info
            onClose = () => {}
        } = options;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const colors = {
            success: 'var(--success-color)',
            error: 'var(--danger-color)',
            warning: 'var(--warning-color)',
            info: 'var(--secondary-color)'
        };

        const body = `
            <div style="text-align: center; padding: 1rem;">
                <i class="fas ${icons[type]}" style="font-size: 3rem; color: ${colors[type]}; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.1rem;">${message}</p>
            </div>
        `;

        const footer = `
            <button class="btn-primary" id="alertOkBtn">OK</button>
        `;

        this.show({
            title,
            body,
            footer,
            size: 'small'
        });

        setTimeout(() => {
            document.getElementById('alertOkBtn')?.addEventListener('click', () => {
                onClose();
                this.close();
            });
        }, 100);
    }

    prompt(options = {}) {
        const {
            title = 'Input',
            message = '',
            placeholder = '',
            defaultValue = '',
            onSubmit = () => {},
            onCancel = () => {}
        } = options;

        const body = `
            <p>${message}</p>
            <div class="form-group">
                <input type="text" id="promptInput" class="form-control" placeholder="${placeholder}" value="${defaultValue}" style="width: 100%; padding: 0.75rem; border: 2px solid var(--border-color); border-radius: 8px;">
            </div>
        `;

        const footer = `
            <button class="btn-primary" id="promptSubmitBtn">Submit</button>
            <button class="btn-outline" id="promptCancelBtn">Cancel</button>
        `;

        this.show({
            title,
            body,
            footer,
            size: 'small'
        });

        setTimeout(() => {
            const input = document.getElementById('promptInput');
            input?.focus();

            document.getElementById('promptSubmitBtn')?.addEventListener('click', () => {
                onSubmit(input.value);
                this.close();
            });

            document.getElementById('promptCancelBtn')?.addEventListener('click', () => {
                onCancel();
                this.close();
            });

            input?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    onSubmit(input.value);
                    this.close();
                }
            });
        }, 100);
    }
}

// Create global modal instance
window.modal = new Modal();