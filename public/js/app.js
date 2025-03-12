document.addEventListener('DOMContentLoaded', () => {
    console.log('Iniciando aplicação...');
    
    // Verifica se o Bootstrap está disponível
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap não está carregado!');
        return;
    }
    
    // Elementos do DOM
    const socket = io();
    const qrModal = document.getElementById('qrModal');
    const qrImage = document.getElementById('qrCode');
    const qrLoading = document.getElementById('qrLoading');
    const qrContainer = document.getElementById('qrContainer');
    const connectBtn = document.getElementById('connect-whatsapp');
    const connectionStatus = document.getElementById('connection-status');
    
    console.log('Elementos encontrados:', {
        qrModal: !!qrModal,
        qrImage: !!qrImage,
        qrLoading: !!qrLoading,
        qrContainer: !!qrContainer,
        connectBtn: !!connectBtn,
        connectionStatus: !!connectionStatus
    });

    // Inicialização do modal Bootstrap
    let bsQrModal;
    try {
        bsQrModal = new bootstrap.Modal(qrModal);
        console.log('Modal Bootstrap inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar modal:', error);
        return;
    }

    // Função para atualizar o status na UI
    function updateConnectionStatus(status) {
        console.log('Atualizando status:', status);
        if (connectionStatus && connectBtn) {
            if (status === 'connected') {
                connectionStatus.textContent = 'Conectado';
                connectionStatus.classList.remove('bg-danger');
                connectionStatus.classList.add('bg-success');
                connectBtn.disabled = true;
                if (bsQrModal) bsQrModal.hide();
            } else {
                connectionStatus.textContent = 'Desconectado';
                connectionStatus.classList.remove('bg-success');
                connectionStatus.classList.add('bg-danger');
                connectBtn.disabled = false;
            }
        }
    }

    // Event listener para o botão de conectar
    if (connectBtn) {
        connectBtn.addEventListener('click', () => {
            console.log('Botão de conexão clicado');
            
            // Reset do estado do modal
            if (qrImage) qrImage.src = '';
            if (qrLoading) qrLoading.style.display = 'block';
            if (qrContainer) qrContainer.style.display = 'none';
            
            // Mostra o modal
            bsQrModal.show();
            
            // Solicita conexão
            socket.emit('connect-whatsapp');
            console.log('Solicitação de conexão enviada');
        });
        console.log('Event listener do botão configurado');
    }

    // Socket.IO event handlers
    socket.on('connect', () => {
        console.log('Socket.IO conectado');
        // Verifica o status inicial quando conectar
        socket.emit('check-connection');
    });

    socket.on('disconnect', () => {
        console.log('Socket.IO desconectado');
        updateConnectionStatus('disconnected');
    });

    socket.on('connection-status', (status) => {
        console.log('Status inicial recebido:', status);
        updateConnectionStatus(status);
    });

    socket.on('qr', (qr) => {
        console.log('QR Code recebido');
        
        if (!qrImage || !qrLoading || !qrContainer) {
            console.error('Elementos do QR Code não encontrados');
            return;
        }

        try {
            // Atualiza o QR Code
            qrImage.onload = () => {
                console.log('QR Code carregado com sucesso');
                qrLoading.style.display = 'none';
                qrContainer.style.display = 'block';
            };

            qrImage.onerror = (error) => {
                console.error('Erro ao carregar QR Code:', error);
                qrLoading.style.display = 'block';
                qrContainer.style.display = 'none';
            };

            qrImage.src = qr;
        } catch (error) {
            console.error('Erro ao exibir QR Code:', error);
        }
    });

    socket.on('connection', (status) => {
        console.log('Status de conexão recebido:', status);
        updateConnectionStatus(status);
    });

    // Verifica o status inicial
    socket.emit('check-connection');
    console.log('Verificação inicial de status enviada');

    // Formulário de enquetes
    const pollForm = document.getElementById('pollForm');
    if (pollForm) {
        const addOptionBtn = document.getElementById('addOption');
        const optionsContainer = document.getElementById('optionsContainer');
        const pollsList = document.getElementById('pollsList');
        const filterButton = document.getElementById('filterButton');
        const filterNumber = document.getElementById('filterNumber');

        // Add new option field
        addOptionBtn?.addEventListener('click', () => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'input-group mb-2';
            optionDiv.innerHTML = `
                <input type="text" class="form-control option-input" required>
                <button type="button" class="btn btn-danger remove-option">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            optionsContainer.querySelector('.mb-3').appendChild(optionDiv);

            // Enable remove buttons if there are more than 2 options
            updateRemoveButtons();
        });

        // Remove option field
        optionsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-option')) {
                e.target.closest('.input-group').remove();
                updateRemoveButtons();
            }
        });

        // Update remove buttons state
        function updateRemoveButtons() {
            const options = document.querySelectorAll('.option-input');
            const removeButtons = document.querySelectorAll('.remove-option');
            removeButtons.forEach(btn => {
                btn.disabled = options.length <= 2;
            });
        }

        // Load polls
        async function loadPolls(number = '') {
            try {
                const url = number ? `/api/polls?targetNumber=${number}` : '/api/polls';
                const response = await fetch(url);
                const polls = await response.json();

                pollsList.innerHTML = polls.map(poll => `
                    <tr>
                        <td>${new Date(poll.createdAt).toLocaleString()}</td>
                        <td>${poll.targetNumber}</td>
                        <td>${poll.question}</td>
                        <td>${poll.options.join(', ')}</td>
                    </tr>
                `).join('');
            } catch (error) {
                console.error('Erro ao carregar enquetes:', error);
                alert('Erro ao carregar enquetes');
            }
        }

        // Filter polls
        filterButton?.addEventListener('click', () => {
            loadPolls(filterNumber.value);
        });

        // Submit poll
        pollForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const options = Array.from(document.querySelectorAll('.option-input'))
                .map(input => input.value.trim())
                .filter(value => value !== '');

            const data = {
                targetNumber: document.getElementById('targetNumber').value.trim(),
                question: document.getElementById('question').value.trim(),
                options: options
            };

            try {
                const response = await fetch('/polls', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error('Erro ao enviar enquete');
                }

                alert('Enquete enviada com sucesso!');
                pollForm.reset();
                loadPolls();
            } catch (error) {
                console.error('Erro ao enviar enquete:', error);
                alert('Erro ao enviar enquete: ' + error.message);
            }
        });

        // Initial load
        loadPolls();
    }

    // Formulário de mensagens
    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
        messageForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                number: document.getElementById('number').value.trim(),
                message: document.getElementById('message').value.trim()
            };

            try {
                const response = await fetch('/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error('Erro ao enviar mensagem');
                }

                alert('Mensagem enviada com sucesso!');
                messageForm.reset();
            } catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                alert('Erro ao enviar mensagem: ' + error.message);
            }
        });
    }
}); 