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
    const connectBtn = document.getElementById('connectBtn');
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
    const bsQrModal = new bootstrap.Modal(qrModal);

    // Função para atualizar o status na UI
    function updateConnectionStatus(status) {
        console.log('Atualizando status:', status);
        if (connectionStatus && connectBtn) {
            if (status === 'connected') {
                connectionStatus.innerHTML = '<span class="text-success">Conectado</span>';
                connectBtn.disabled = true;
                if (bsQrModal) bsQrModal.hide();
            } else {
                connectionStatus.innerHTML = '<span class="text-danger">Desconectado</span>';
                connectBtn.disabled = false;
            }
        }
    }

    // Quando o socket conectar
    socket.on('connect', () => {
        console.log('Socket.IO conectado');
        socket.emit('check-connection');
    });

    // Atualiza o status da conexão
    socket.on('connection-status', (status) => {
        console.log('Status da conexão:', status);
        if (status === 'connected') {
            connectionStatus.innerHTML = '<span class="text-success">Conectado</span>';
            connectBtn.disabled = true;
            bsQrModal.hide();
        } else {
            connectionStatus.innerHTML = '<span class="text-danger">Desconectado</span>';
            connectBtn.disabled = false;
        }
    });

    // Quando receber o QR Code
    socket.on('qr', (qr) => {
        console.log('QR Code recebido');
        qrImage.src = qr;
        qrLoading.style.display = 'none';
        qrContainer.style.display = 'block';
        bsQrModal.show();
    });

    // Quando clicar no botão de conectar
    connectBtn.addEventListener('click', () => {
        console.log('Solicitando conexão...');
        qrLoading.style.display = 'block';
        qrContainer.style.display = 'none';
        bsQrModal.show();
        socket.emit('connect-whatsapp');
    });

    // Quando a conexão for estabelecida
    socket.on('connection', (status) => {
        console.log('Status da conexão atualizado:', status);
        if (status === 'connected') {
            connectionStatus.innerHTML = '<span class="text-success">Conectado</span>';
            connectBtn.disabled = true;
            bsQrModal.hide();
        } else {
            connectionStatus.innerHTML = '<span class="text-danger">Desconectado</span>';
            connectBtn.disabled = false;
        }
    });

    // Quando o socket desconectar
    socket.on('disconnect', () => {
        console.log('Socket.IO desconectado');
        connectionStatus.innerHTML = '<span class="text-danger">Desconectado</span>';
        connectBtn.disabled = false;
    });

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