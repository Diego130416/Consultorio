// --- app.js (Versión WAMP/PHP/MySQL en otras plabras con la base de datos) ---

(() => {
    
    // ---------- 1. UTILIDADES Y CONFIGURACIÓN GLOBAL ----------
    const $ = id => document.getElementById(id);
    const nowISO = () => new Date().toISOString().slice(0, 10); // Devuelve YYYY-MM-DD
    
    // Constantes de la API (apuntan a los archivos PHP)
    const API_LOGIN = 'api/login_api.php';
    const API_PACIENTES = 'api/pacientes_api.php';
    const API_AGENDA = 'api/agenda_api.php';
    const API_HISTORIAL = 'api/historial_api.php';
    const API_REPORTES = 'api/reportes_api.php';

    // Listas de datos estáticos
    const ALL_ALERGIES = ['Ninguna','Penicilina','Amoxicilina','Cefalosporinas','Macrólidos','Tetraciclinas','Aminoglucósidos','Quinolonas','Sulfonamidas','Anestésicos locales','Anestésicos generales','AINE','Ibuprofeno','Naproxeno','Paracetamol','Látex','Mariscos','Crustáceos','Pescado','Frutos secos','Huevo','Leche','Polen','Ácaros del polvo','Moho','Picaduras de insecto','Perfumes','Metales','Otro'];
    const ALL_CHRONIC = ['Ninguna','Diabetes tipo 1','Diabetes tipo 2','Hipertensión arterial','Dislipidemia','Enfermedad coronaria','Insuficiencia cardíaca','Arritmias','Accidente cerebrovascular','EPOC','Asma','Apnea del sueño','Insuficiencia renal crónica','Enfermedad hepática crónica','Hipotiroidismo','Hipertiroidismo','Osteoporosis','Artritis reumatoide','Enfermedad autoinmune','Cáncer','Epilepsia','Parkinson','Trastorno psiquiátrico','Obesidad','Tromboembolismo venoso','Otro'];
    const ALL_MEDICATIONS = ['Ninguna','Paracetamol','Ibuprofeno','Aspirina','Naproxeno','Metformina','Insulina','Enalapril','Lisinopril','Losartán','Atorvastatina','Simvastatina','Omeprazol','Pantoprazol','Levotiroxina','Prednisona','Metotrexato','Amoxicilina','Cefalexina','Tramadol','Codeína','Diazepam','Alprazolam','Sertralina','Fluoxetina','Warfarina','Rivaroxabán','Salbutamol','Antidepresivos','Antipsicóticos','Otro'];

    // (La firma sigue siendo local, como en el app.js original)
    const SIGNATURE_KEY = 'clinic_signature_v1'; 

 // ---------- 2. MANEJO DE COMUNICACIÓN API ----------

    /**
     * Función genérica para enviar datos (POST) a la API de PHP.
     */
    async function postAPI(url, data) {
        let response; 
        let responseText = ''; // Para guardar la respuesta como texto
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            // Leemos la respuesta como TEXTO una sola vez.
            responseText = await response.text();

            // Si la respuesta no fue 'ok' (ej. 404, 500, 403)
            if (!response.ok) {
                // Intentamos ver si el texto es un JSON de error
                try {
                    const errorData = JSON.parse(responseText);
                    throw new Error(errorData.error || `Error del servidor: ${response.status}`);
                } catch (e) {
                    // Si no es JSON, es un error de PHP. ¡Lo mostramos!
                    console.error('Respuesta (no-JSON) del servidor:', responseText);
                    throw new Error(responseText.length < 200 ? responseText : "Error del servidor. Ver consola (F12).");
                }
            }

            // Si todo fue 'ok', AHORA SÍ convertimos el texto a JSON
            return JSON.parse(responseText); 
        
        } catch (error) {
            // Si el error ya fue un error de PHP, 'error.message' lo contendrá
            console.error(`Error en postAPI (${url}):`, error.message);
            
            // Si responseText está vacío, fue un error de red (sin conexión)
            if (!responseText && error.name !== 'SyntaxError') {
                return { success: false, error: "Error de conexión. Revisa la pestaña 'Red' (F12)." };
            }
            
            // Devolvemos el mensaje de error que capturamos
            return { success: false, error: error.message };
        }
    }

    /**
     * Función genérica para obtener datos (GET) de la API de PHP.
     */
    async function getAPI(url) {
        let response;
        let responseText = ''; // Para guardar la respuesta como texto
        try {
            response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            // Leemos la respuesta como TEXTO una sola vez.
            responseText = await response.text();

            // Si la respuesta no fue 'ok' (ej. 404, 500)
            if (!response.ok) {
                // Intentamos ver si el texto es un JSON de error
                try {
                  const errorData = JSON.parse(responseText);
                    throw new Error(errorData.error || `Error del servidor: ${response.status}`);
                } catch (e) {
                    // Si no es JSON, es un error de PHP. ¡Lo mostramos!
                    console.error('Respuesta (no-JSON) del servidor:', responseText);
                    throw new Error(responseText.length < 200 ? responseText : "Error del servidor. Ver consola (F12).");
                }
            }
            
            // Si todo fue 'ok', AHORA SÍ convertimos el texto a JSON
            return JSON.parse(responseText); 

        } catch (error) {
            // Si el error ya fue un error de PHP, 'error.message' lo contendrá
            console.error(`Error en getAPI (${url}):`, error.message);
            
            // Si responseText está vacío, fue un error de red (sin conexión)
            if (!responseText && error.name !== 'SyntaxError') {
                return { success: false, error: "Error de conexión. Revisa la pestaña 'Red' (F12)." };
            }
            
            // Devolvemos el mensaje de error que capturamos
            return { success: false, error: error.message };
        }
    }

    // ---------- 3. MANEJO DE NOTIFICACIONES Y MODALES ----------
    function showMessage(text, type = 'info', timeout = 3500) {
        const box = $('messageBox');
        if (!box) { 
            const loginBox = $('loginMessageBox');
            if (loginBox) {
                loginBox.textContent = text;
                loginBox.className = 'message ' + (type || 'info');
                loginBox.style.display = 'block';
            } else {
                alert(text); // Fallback final si todo llega a fallar
            }
            return;
        }
        box.textContent = text;
        box.className = 'message ' + (type || 'info');
        box.style.display = 'block';
        clearTimeout(box._hideTimer);
        box._hideTimer = setTimeout(() => { box.style.display = 'none'; }, timeout);
    }

    function showConfirm(title, text) {
        return new Promise(resolve => {
            const modal = $('confirmModal');
            if (!modal) { resolve(window.confirm(text)); return; }
            const titleEl = $('confirmModalTitle');
            const textEl = $('confirmModalText');
            if(titleEl) titleEl.textContent = title;
            if(textEl) textEl.textContent = text;
            modal.classList.remove('hidden');
            const okBtn = $('confirmModalOk');
            const cancelBtn = $('confirmModalCancel');
            
            const close = (value) => {
                modal.classList.add('hidden');
                okBtn.replaceWith(okBtn.cloneNode(true));
                cancelBtn.replaceWith(cancelBtn.cloneNode(true));
                resolve(value);
            };
            
            okBtn.addEventListener('click', () => close(true), { once: true });
            cancelBtn.addEventListener('click', () => close(false), { once: true });
        });
    }

    function showPrompt(title, text, defaultValue = '') {
        return new Promise(resolve => {
            const modal = $('promptModal');
            if (!modal) { resolve(window.prompt(text, defaultValue)); return; }
            const titleEl = $('promptModalTitle');
            const textEl = $('promptModalText');
            if(titleEl) titleEl.textContent = title;
            if(textEl) textEl.textContent = text;
            const input = $('promptModalInput');
            input.value = defaultValue;
            modal.classList.remove('hidden');
            input.focus();
            const okBtn = $('promptModalOk');
            const cancelBtn = $('promptModalCancel');

            const close = (value) => {
                modal.classList.add('hidden');
                okBtn.replaceWith(okBtn.cloneNode(true));
                cancelBtn.replaceWith(cancelBtn.cloneNode(true));
                input.onkeydown = null;
                resolve(value);
            };
            
            const submit = () => close(input.value);
            
            okBtn.addEventListener('click', submit, { once: true });
            cancelBtn.addEventListener('click', () => close(null), { once: true });
            input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
        });
    }

// --- FIN DEL BLOQUE 1 ---

// ---------- 4. LÓGICA DE RFC Y EDAD ----------
    function calculateAge(birthdate) {
        if (!birthdate) return '';
        try {
            const today = new Date();
            // Usar 'T00:00:00' para asegurar que se interprete como fecha local del sistemas o la sona horaria correcta
            const birthDate = new Date(birthdate + 'T00:00:00'); 
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age >= 0 ? age : ''; // Devuelve '' si la fecha es futura
        } catch(e) {
            return '';
        }
    }
    
/**
     * Función para procesar los nombres y apellidos según las reglas del SAT.
     * Maneja nombres compuestos (ejem. José María), artículos (ejem. De, La, O) y mas excepciones que existen.
     * (este codigo se corrigio para el nombre de la profesira 'Ma. Del Consuelo' ya que tiene 2 articulos y un nombre copuesto)
     */
    function getRFCComponents(nombre, paterno, materno) {
        const normalize = (str) => {
            if (!str) return '';
            return str.toUpperCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
                .replace(/Ñ/g, 'X') // El SAT reemplaza Ñ con X
                .replace(/[^A-Z\s]/g, '') // Quitar caracteres especiales
                .replace(/\s+/g, ' ').trim(); // Limpiar espacios múltiples
        };
        
        // --- CORRECCIÓN: Definir artículos y excepciones aquí arriba ---
        const articles = [
            'DE', 'LA', 'LAS', 'LOS', 'DEL', 'Y', 'A', 'E', 'EN', 'EL', 
            'VON', 'VAN', 'DI', 'DA', 'DAS', 'DELLO', 'DELLA', 'DEI', 'DEGLI'
        ];
        const exceptions = ['MC', 'MAC']; 

        const getSignificantPart = (fullName) => {
            const parts = (fullName || '').split(' ');
            if (parts.length === 1) return parts[0];
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (exceptions.includes(part)) {
                    return parts.slice(i).join(''); // Ej. McFly -> MCFLY
                }
                if (!articles.includes(part)) {
                    return parts.slice(i).join(' '); // Ej. "GARZA DE LA" -> "GARZA DE LA"
                }
            }
            if (parts.length > 0) {
                return parts[parts.length - 1]; // Ej. "DE LA O" -> "O"
            }
            return '';
        };

        const getVowel = (str) => {
            if (!str) return 'X';
            // Buscar primera vocal INTERNA (a partir del segundo carácter)
            const match = str.substring(1).match(/[AEIOU]/); 
            return match ? match[0] : 'X'; // Si no hay vocal, usar X
        };

        // --- Procesar Apellidos ---
        const p_norm = normalize(paterno);
        const m_norm = normalize(materno);
        
        const p_sig_full = getSignificantPart(p_norm);
        const p_sig_first = p_sig_full.split(' ')[0]; // Tomamos solo la primera palabra (ej. "GARZA" de "GARZA DE LA")
        
        const m_sig_full = getSignificantPart(m_norm);
        const m_initial = m_sig_full ? m_sig_full.charAt(0) : 'X'; // 'X' si no hay apellido materno

        // --- Procesar Nombres (ejem. Lógica "José María") ---
        const nameParts = normalize(nombre).split(' ');
        const skipNames = ['JOSE', 'J', 'MARIA', 'MA']; 
        
        let significantName = nameParts[0] || '';
        
        // Si el primer nombre es "JOSE" o "MARIA" Y hay un segundo nombre...
        if (skipNames.includes(significantName) && nameParts.length > 1) {
            // ... buscar el *siguiente* nombre que NO sea un artículo.
            significantName = '';
            for (let i = 1; i < nameParts.length; i++) {
                const part = nameParts[i];
                // Si no es un artículo, lo tomamos como el nombre significativo
                if (!articles.includes(part)) { 
                    significantName = part; // Ej. 'CONSUELO'
                    break;
                }
            }
            // Si sigue vacío (ej. el nombre era "MA DEL"), usamos el primer nombre ("MA")
            if (significantName === '') {
                significantName = nameParts[0]; 
            }
        }
        const n_initial = significantName ? significantName.charAt(0) : 'X'; // 'X' si no hay nombre

        // --- Construir Componentes ---
        let p1, p2;

        // Regla para apellidos paternos de 1 o 2 letras (ej. O, MA)
        if (p_sig_first.length <= 2) {
             p1 = p_sig_first.charAt(0) || 'X';
             p2 = p_sig_first.charAt(1) || 'X'; // Usa la segunda letra, sea vocal o no
        } else {
             p1 = p_sig_first.charAt(0);
             p2 = getVowel(p_sig_first); // Usa la primera vocal interna
        }

        // Regla estándar: P1 + V(P) + M1 + N1
        return p1 + p2 + m_initial + n_initial;
    }

    /**
     * Función principal para generar RFC
     */
    function generateRFC(nombre, paterno, materno, birthdate) {
        if (!nombre || !paterno || !birthdate) return '';

        // 1. Obtener los 4 caracteres base
        let rfcBase = getRFCComponents(nombre, paterno, materno);
        
        // 2. Reemplazar palabras inconvenientes
        const badWords = [
            'BUEI','BUEY','CACA','CACO','CAGA','CAGO','CAKA','COGE','COJA','COJO','CULO',
            'FETO','JOTO','KACA','KACO','KAGA','KAGO','KOGE','KOJO','KULO','MAMO','MEAR',
            'MEAS','MEON','MION','MULA','PEDO','PEDA','PENE','PUTA','PUTO','QULO','RATA','RUIN'
        ];
        
        if (badWords.includes(rfcBase)) {
            rfcBase = rfcBase.slice(0, 3) + 'X'; // Cambiar la última letra por X
        }

        // 3. Añadir Fecha
        try {
            const date = new Date(birthdate + 'T00:00:00'); 
            const yy = date.getFullYear().toString().slice(-2);
            const mm = (date.getMonth() + 1).toString().padStart(2, '0');
            const dd = date.getDate().toString().padStart(2, '0');
            
            // No generamos homoclave, solo los primeros 10 caracteres
            return rfcBase + yy + mm + dd; 
        } catch(e) {
            return rfcBase; // Devuelve solo la parte de letras si la fecha es inválida
        }
    }


    // ---------- 5. MANEJO DE WIDGETS DE CHECKBOX ----------
    
    function renderCheckboxGroup(containerId, items) {
        const cont = $(containerId);
        if (!cont) return;
        cont.innerHTML = '';
        items.forEach(v => {
            const label = document.createElement('label');
            label.className = 'checkbox-item';
            label.tabIndex = 0;
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = v;
            cb.style.display = 'none';
            label.innerHTML = `<span>${v}</span>`;
            label.prepend(cb);
            cont.appendChild(label);
        });
        cont.addEventListener('click', e => {
            const lbl = e.target.closest('.checkbox-item');
            if (!lbl) return;
            const cb = lbl.querySelector('input[type="checkbox"]');
            if (!cb || cb.disabled) return;
            cb.checked = !cb.checked;
            lbl.classList.toggle('checked', cb.checked);
            cont.dispatchEvent(new Event('change', { bubbles: true }));
        });
        cont.addEventListener('keydown', e => {
            if (e.key !== ' ' && e.key !== 'Enter') return;
            const lbl = e.target.closest('.checkbox-item');
            if (!lbl) return;
            e.preventDefault();
            const cb = lbl.querySelector('input[type="checkbox"]');
            if (!cb || cb.disabled) return;
            cb.checked = !cb.checked;
            lbl.classList.toggle('checked', cb.checked);
            cont.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function getCheckedValues(containerId) {
        const cont = $(containerId);
        if (!cont) return [];
        return Array.from(cont.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    }
    
    function setCheckedValues(containerId, values = []) {
        const cont = $(containerId);
        if (!cont) return;
        Array.from(cont.querySelectorAll('input[type="checkbox"]')).forEach(cb => {
            cb.checked = values.includes(cb.value);
            cb.closest('.checkbox-item')?.classList.toggle('checked', cb.checked);
        });
        // Disparamos 'change' para que se aplique la lógica de "Ninguna" y "Otro"
        cont.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function collectGroup(containerId, otherInputId) {
        const vals = getCheckedValues(containerId);
        if (vals.includes('Otro')) {
            const other = $(otherInputId)?.value?.trim();
            if (other) {
                return vals.filter(v => v !== 'Otro').concat([other]);
            } else {
                return vals.filter(v => v !== 'Otro');
            }
        }
        return vals;
    }

    function populateOtherField(patientValues = [], allItems, groupId, containerId, inputId) {
        if (!patientValues || patientValues.length === 0) return;
        const customValue = patientValues.find(val => !allItems.includes(val));
        if (customValue) {
            const group = $(groupId);
            const container = $(containerId);
            const input = $(inputId);
            const otroCheckbox = group?.querySelector('input[value="Otro"]');
            if (otroCheckbox) {
                otroCheckbox.checked = true;
                otroCheckbox.closest('.checkbox-item')?.classList.add('checked');
            }
            if (container) container.style.display = 'block';
            if (input) input.value = customValue;
        }
    }

    function bindNoneBehavior(containerId) {
        const cont = $(containerId);
        if (!cont) return;
        cont.addEventListener('change', () => {
            const noneCb = cont.querySelector('input[value="Ninguna"]');
            if (!noneCb) return;
            const others = Array.from(cont.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.value !== 'Ninguna');
            if (noneCb.checked) {
                others.forEach(cb => { 
                    cb.checked = false; 
                    cb.disabled = true; 
                    cb.closest('.checkbox-item')?.classList.remove('checked'); 
                });
            } else {
                others.forEach(cb => { cb.disabled = false; });
            }
        });
    }

    function bindOtherFieldVisibility(groupId, containerId) {
        const group = $(groupId);
        if (!group) return;
        group.addEventListener('change', () => {
            const otroCheckbox = group.querySelector('input[value="Otro"]');
            const container = $(containerId);
            if (otroCheckbox && container) {
                container.style.display = otroCheckbox.checked ? 'block' : 'none';
                if(otroCheckbox.checked) {
                    $(containerId)?.querySelector('input')?.focus();
                }
            }
        });
    }
    
    // --- !! CORRECCIÓN DE BUG: 'collectSurgeries' MOVIDO AFUERA !! ---
    // Esta función (de tu app.js original) ahora es visible para handlePatientSubmit
    function collectSurgeries() {
        const surgeriesToggle = $('surgeriesToggle');
        const surgeriesContainer = $('surgeriesContainer');
        // --- CORRECCIÓN DE LÓGICA: Checar si el toggle existe antes de leer 'value' ---
        if (!surgeriesToggle || surgeriesToggle.value !== 'Si') {
            return [];
        }
        const surgeries = [];
        surgeriesContainer.querySelectorAll('.surgery-group').forEach(group => {
            const surgery = {
                date: group.querySelector('.surgery-date').value,
                procedure: group.querySelector('.surgery-procedure').value.trim(),
                complication: group.querySelector('.surgery-complication').value.trim(),
            };
            if (surgery.date || surgery.procedure || surgery.complication) {
                surgeries.push(surgery);
            }
        });
        return surgeries;
    }

    // --- FIN DEL BLOQUE 2---

// ---------- 6. MÓDULO DE LOGIN (NUEVO) ----------

    /**
     * Se ejecuta solo en 'login.html'.
     * Maneja el envío del formulario de inicio de sesión.
     */
    function initLogin() {
        const loginForm = $('loginForm');
        if (!loginForm) return; // Solo se ejecuta en login.html

        // Al cargar la página de login, primero revisamos si YA estamos logueados
        (async () => {
            const data = await postAPI(API_LOGIN, { action: 'check_session' });
            if (data.success && data.role === 'medico') {
                // ¡Ya está logueado! Lo mandamos a la agenda.
                // Revisa si hay una página guardada a la que queríamos ir
                const redirectPage = sessionStorage.getItem('redirectAfterLogin') || 'agenda.html';
                sessionStorage.removeItem('redirectAfterLogin'); // Limpiar
                window.location.href = redirectPage;
            }
            // Si no está logueado, no hace nada y deja que el usuario inicie sesión.
        })();

        // Manejador del formulario
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = $('username').value;
            const password = $('password').value;
            const btn = loginForm.querySelector('button[type="submit"]');
            
            if (!username || !password) {
                showMessage('Por favor, ingrese usuario y contraseña.', 'warning');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> &nbsp; Verificando...';

            // Llamamos a la API de login
            const data = await postAPI(API_LOGIN, {
                action: 'login',
                username: username,
                password: password // Enviamos la contraseña en texto plano
            });

            if (data.success) {
                showMessage('Inicio de sesión exitoso. Redirigiendo...', 'success');
                // Lo mandamos a la agenda o a la pág. guardada
                const redirectPage = sessionStorage.getItem('redirectAfterLogin') || 'agenda.html';
                sessionStorage.removeItem('redirectAfterLogin'); // Limpiar
                setTimeout(() => {
                    window.location.href = redirectPage;
                }, 1000);
            } else {
                // Mostramos el error (ej. "Contraseña incorrecta")
                showMessage(data.error || 'Error desconocido.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> &nbsp; Iniciar Sesión';
            }
        });
    }
    
    // ---------- 7. MÓDULO DE LOGOUT (NUEVO) ----------
    
    /**
     * Se ejecuta en todas las páginas de admin (agenda.html, paciente.html, etc.)
     * Añade el evento al botón de "Salir".
     */
    function initLogout() {
        // Buscamos el botón de logout en CUALQUIER página de admin
        const logoutButton = $('logoutButton');
        if (logoutButton) {
             logoutButton.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const confirmed = await showConfirm('Cerrar Sesión', '¿Estás seguro de que quieres cerrar la sesión?');
                if (!confirmed) return;

                const data = await postAPI(API_LOGIN, { action: 'logout' });
                
                if (data.success) {
                    window.location.href = 'login.html';
                } else {
                    showMessage(data.error || 'No se pudo cerrar la sesión.', 'error');
                }
            });
        }
    }

    // ---------- 8. MÓDULO DE PACIENTES (REESCRITO) ----------
    
    // Caché global para guardar la lista de pacientes
    let allPatients = [];
    
    /**
     * Carga todos los pacientes desde la BD (api/pacientes_api.php)
     * y los guarda en el caché 'allPatients'.
     * @param {boolean} force - Si es true, fuerza la recarga desde la BD
     */
    async function loadAllPatients(force = false) {
        // Si ya tenemos pacientes en caché y no forzamos la recarga, los usamos.
        if (allPatients.length > 0 && !force) {
            return allPatients;
        }
        
        // Si no, llamamos a la API
        const data = await getAPI(`${API_PACIENTES}?action=get_all`);
        if (data.success) {
            allPatients = data.patients; // Guarda en caché
            return allPatients;
        } else {
            showMessage(data.error || 'No se pudieron cargar los pacientes.', 'error');
            return [];
        }
    }
    
    /**
     * Rellena un <select> (como el de 'receta.html') con la lista de pacientes
     * @param {string} selectId - El ID del <select> a rellenar
     * @param {string|null} selectedId - El ID del paciente que debe estar pre-seleccionado
     */
    async function populatePatientSelect(selectId, selectedId = null) {
        const select = $(selectId);
        if (!select) return; // Si la página no tiene este select, no hace nada
        
        select.disabled = true;
        select.innerHTML = '<option value="">Cargando pacientes...</option>';
        
        const patients = await loadAllPatients(); // Usa el caché si está disponible
        
        select.innerHTML = '<option value="">Seleccione un paciente</option>';
        patients.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id; // ID de la BD
            option.textContent = p.nombre_completo; // Clave de la BD en español
            
            // Usamos '==' (no '===') porque el ID puede ser string o número
            if (p.id == selectedId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        select.disabled = false;
    }

// --- FIN DEL BLOQUE 3 ---
// (El archivo se deja abierto para pegar el siguiente bloque)

/**
     * MÓDULO: Formulario de Paciente (paciente.html)
     * Se encarga de inicializar el formulario para crear o editar un paciente.
     */
    async function initPatientForm() {
        const form = $('patientForm');
        if (!form) return; // Salir si no estamos en paciente.html
        
        // 1. Renderizar widgets de checkboxes
        renderCheckboxGroup('allergiesGroup', ALL_ALERGIES);
        renderCheckboxGroup('chronicGroup', ALL_CHRONIC);
        renderCheckboxGroup('medsGroup', ALL_MEDICATIONS);
        
        // 2. Conectar lógica de "Ninguna" y "Otro"
        bindNoneBehavior('allergiesGroup');
        bindNoneBehavior('chronicGroup');
        bindNoneBehavior('medsGroup');
        bindOtherFieldVisibility('allergiesGroup', 'allergiesOtherContainer');
        bindOtherFieldVisibility('chronicGroup', 'chronicOtherContainer');
        bindOtherFieldVisibility('medsGroup', 'medsOtherContainer');

        // 3. Conectar lógica de RFC y Edad
        const rfcInput = $('rfc');
        const nombreInput = $('nombre');
        const paternoInput = $('paterno');
        const maternoInput = $('materno');
        const birthdateInput = $('birthdate');
        const ageInput = $('age');

        const updateDynamicFields = () => {
            const nombre = nombreInput.value;
            const paterno = paternoInput.value;
            const materno = maternoInput.value;
            const birthdate = birthdateInput.value;
            if (birthdate) ageInput.value = calculateAge(birthdate);
            if (nombre && paterno && birthdate) {
                rfcInput.value = generateRFC(nombre, paterno, materno, birthdate);
            }
        };
        [nombreInput, paternoInput, maternoInput, birthdateInput].forEach(el => {
            el?.addEventListener('input', updateDynamicFields);
        });

        // 4. Conectar lógica de Cirugías
        const surgeriesToggle = $('surgeriesToggle');
        const surgeriesContainer = $('surgeriesContainer');
        const addSurgeryBtn = $('addSurgeryBtn');

        // (La función collectSurgeries() ya existe en el scope global (Bloque 2))
        // Esta función auxiliar es local para initPatientForm
        const addSurgeryBlock = (data = {}) => {
            const surgeryId = 'surg_' + Math.random().toString(36).slice(2, 9);
            const block = document.createElement('div');
            block.className = 'surgery-group';
            block.id = surgeryId;
            block.innerHTML = `
                <button type="button" class="btn danger" data-surg-id="${surgeryId}" style="position:absolute; top:10px; right:10px; padding: 2px 8px; font-size: 14px;">×</button>
                <label>Fecha<input type="date" class="surgery-date" value="${data.date || ''}"></label>
                <label>Procedimiento<input type="text" class="surgery-procedure" placeholder="Ej. Apendicectomía" value="${data.procedure || ''}"></label>
                <label>Complicaciones<input type="text" class="surgery-complication" placeholder="Ej. Infección del sitio" value="${data.complication || ''}"></label>
            `;
            surgeriesContainer.insertBefore(block, addSurgeryBtn);
        };

        surgeriesToggle?.addEventListener('change', () => {
            const show = surgeriesToggle.value === 'Si';
            surgeriesContainer.style.display = show ? 'block' : 'none';
            if (show && surgeriesContainer.querySelectorAll('.surgery-group').length === 0) {
                addSurgeryBlock();
            }
        });
        addSurgeryBtn?.addEventListener('click', () => addSurgeryBlock());
        surgeriesContainer?.addEventListener('click', e => {
            if (e.target.dataset.surgId) {
                $(e.target.dataset.surgId)?.remove();
            }
        });

        // 5. Conectar lógica de Sustancias
        const substanceSel = $('substance');
        const substanceFields = $('substanceOccasionalFields');
        substanceSel?.addEventListener('change', () => {
            substanceFields.style.display = (substanceSel.value === 'Si') ? 'block' : 'none';
        });

        // 6. Revisar si estamos en MODO EDICIÓN (leyendo la URL)
        const params = new URL(window.location.href).searchParams;
        const editId = params.get('edit');
        
        if (editId) {
            // --- MODO EDICIÓN ---
            document.title = "Editar Paciente";
            form.querySelector('button[type="submit"]').textContent = 'Actualizar Paciente';

            // Cargamos los datos del paciente desde la API
            const data = await getAPI(`${API_PACIENTES}?action=get_one&id=${editId}`);
            if (!data.success) {
                showMessage(data.error || 'No se pudo cargar el paciente.', 'error');
                return;
            }
            const p = data.patient; // p ahora tiene los nombres de columna en español

            // Llenamos los campos del formulario
            $('nombre').value = p.nombre || '';
            $('paterno').value = p.apellido_paterno || ''; // BD en español
            $('materno').value = p.apellido_materno || ''; // BD en español
            $('birthdate').value = p.fecha_nacimiento || ''; // BD en español
            $('age').value = p.edad || calculateAge(p.fecha_nacimiento);
            $('sex').value = p.sexo || ''; // BD en español
            $('phone').value = p.telefono || ''; // BD en español
            $('rfc').value = p.rfc || '';
            $('familyHistory').value = p.antecedentes_familiares || ''; // BD en español
            $('reason').value = p.motivo_consulta || ''; // BD en español
            $('symptoms').value = p.sintomas || ''; // BD en español
            
            // Llenar checkboxes y "Otros"
            setCheckedValues('allergiesGroup', p.alergias);
            populateOtherField(p.alergias, ALL_ALERGIES, 'allergiesGroup', 'allergiesOtherContainer', 'allergiesOther');
            setCheckedValues('chronicGroup', p.enfermedades_cronicas);
            populateOtherField(p.enfermedades_cronicas, ALL_CHRONIC, 'chronicGroup', 'chronicOtherContainer', 'chronicOther');
            setCheckedValues('medsGroup', p.medicamentos_actuales);
            populateOtherField(p.medicamentos_actuales, ALL_MEDICATIONS, 'medsGroup', 'medsOtherContainer', 'medicationsOther');

            // Llenar Cirugías
            if (Array.isArray(p.cirugias_previas) && p.cirugias_previas.length > 0) {
                surgeriesToggle.value = 'Si';
                surgeriesContainer.style.display = 'block';
                surgeriesContainer.querySelectorAll('.surgery-group').forEach(g => g.remove());
                p.cirugias_previas.forEach(surgery => addSurgeryBlock(surgery));
            } else {
                // Si no hay cirugías, pero el campo existe, es "No" o "Seleccione"
                surgeriesToggle.value = (p.cirugias_previas && p.cirugias_previas.length === 0) ? 'No' : ''; 
                surgeriesContainer.style.display = 'none';
            }

            // Llenar Sustancias
            if (p.consumo_sustancias) {
                substanceSel.value = p.consumo_sustancias;
                if (p.consumo_sustancias === 'Si' && p.detalle_sustancias) {
                    substanceFields.style.display = 'block';
                    $('substanceName').value = p.detalle_sustancias.name || '';
                    $('substanceFreq').value = p.detalle_sustancias.frequency || '';
                }
            }

            // Asignamos el manejador de ACTUALIZAR
            form.addEventListener('submit', (e) => handlePatientSubmit(e, editId));

        } else {
            // --- MODO CREACIÓN ---
            // Asignamos el manejador de CREAR
            form.addEventListener('submit', (e) => handlePatientSubmit(e, null));
        }

        // 7. Botón de Limpiar
        $('resetBtn')?.addEventListener('click', () => {
            if(editId) {
                // Si estamos editando, recargamos la página para restaurar datos
                window.location.reload();
            } else {
                // Si estamos creando, solo reseteamos
                form.reset();
                ['allergiesOtherContainer','chronicOtherContainer','medsOtherContainer','substanceOccasionalFields', 'surgeriesContainer'].forEach(id => {
                    const el = $(id); if (el) el.style.display = 'none';
                });
                surgeriesContainer.querySelectorAll('.surgery-group').forEach(group => group.remove());
                setCheckedValues('allergiesGroup', []);
                setCheckedValues('chronicGroup', []);
                setCheckedValues('medsGroup', []);
            }
        });
    }

    /**
     * Manejador centralizado para CREAR y ACTUALIZAR un paciente
     * Esta función es llamada por initPatientForm
     */
    async function handlePatientSubmit(e, patientId) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> &nbsp; Guardando...';

        // 1. Recolectar todos los datos del formulario
        const nombre = $('nombre').value.trim();
        const paterno = $('paterno').value.trim();
        const materno = $('materno').value.trim();
        const birthdate = $('birthdate').value;

        // Validaciones
        if (!nombre || !paterno || !birthdate) {
            showMessage('Nombre, Apellido Paterno y Fecha de Nacimiento son obligatorios.', 'warning');
            btn.disabled = false;
            btn.innerHTML = patientId ? 'Actualizar Paciente' : 'Guardar Paciente';
            return;
        }

        const substance = $('substance').value || null;
        let substanceDetail = null;
        if (substance === 'Si') {
            substanceDetail = { 
                name: $('substanceName').value.trim() || null, 
                frequency: $('substanceFreq').value.trim() || null 
            };
        }

        // 2. Traducción de claves JS a claves de BD (español)
        // ¡¡AQUÍ ES DONDE SE CORRIGE EL ERROR DE RFC!!
        // La función collectSurgeries() ahora es encontrada.
        const patientData = {
            id: patientId, 
            nombre: nombre,
            apellido_paterno: paterno,
            apellido_materno: materno,
            nombre_completo: [nombre, paterno, materno].filter(Boolean).join(' '),
            fecha_nacimiento: birthdate,
            edad: calculateAge(birthdate),
            sexo: $('sex').value || null,
            telefono: $('phone').value.trim() || null,
            rfc: generateRFC(nombre, paterno, materno, birthdate), // <-- Esta línea ahora SÍ se ejecuta
            alergias: collectGroup('allergiesGroup','allergiesOther'),
            enfermedades_cronicas: collectGroup('chronicGroup','chronicOther'),
            cirugias_previas: collectSurgeries(), // <-- Esta línea ya no rompe el script
            medicamentos_actuales: collectGroup('medsGroup','medicationsOther'),
            antecedentes_familiares: $('familyHistory').value.trim(),
            motivo_consulta: $('reason').value.trim(),
            sintomas: $('symptoms').value.trim(),
            consumo_sustancias: substance,
            detalle_sustancias: substanceDetail
        };

        // 3. Determinar la acción y enviar a la API
        const action = patientId ? 'update' : 'create';
        const data = await postAPI(API_PACIENTES, {
            action: action,
            patient: patientData // Enviamos el objeto con claves en español
        });

        // 4. Manejar la respuesta
        if (data.success) {
            showMessage(data.message || 'Paciente guardado.', 'success');
            await loadAllPatients(true); // Forzar recarga del caché

            const targetId = action === 'create' ? data.newId : patientId;
            setTimeout(() => {
                // Redirigimos a la página de detalle del paciente
                window.location.href = `paciente_full.html?pid=${targetId}`;
            }, 1000);
            
        } else {
            // Error (ej. "Paciente duplicado")
            showMessage(data.error || 'Ocurrió un error.', 'error');
            btn.disabled = false;
            btn.innerHTML = patientId ? 'Actualizar Paciente' : 'Guardar Paciente';
        }
    }

    // --- FIN DEL BLOQUE 4 ---

    // ---------- 9. MÓDULO PÁGINA DE HISTORIAL (REESCRITO) ----------

    /**
     * MÓDULO: Página de Historial (historial.html)
     * Se encarga de cargar y mostrar la lista de pacientes.
     */
    async function initHistoryPage() {
        const container = $('patientListContainer');
        if (!container) return; // Salir si no estamos en historial.html
        
        const searchInput = $('patientSearchInput');
        
        // 1. Cargar pacientes desde la API (o caché)
        // (La función loadAllPatients ya está definida en el Bloque 3)
        const patients = await loadAllPatients();
        
        // 2. Función de renderizado
        const renderPatientList = (patientArray) => {
            container.innerHTML = '';
            if (patientArray.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--muted);">No se encontraron pacientes.</p>';
                return;
            }
            patientArray.forEach(p => {
                const item = document.createElement('a');
                item.className = 'patient-list-item';
                item.href = `paciente_full.html?pid=${p.id}`; // ID de la BD
                item.innerHTML = `
                    <div class="patient-info">
                        <!-- Usamos la clave 'nombre_completo' de la BD -->
                        <div class="patient-list-name">${p.nombre_completo}</div>
                        <div class="patient-list-curp"><strong>RFC:</strong> ${p.rfc || 'No registrado'}</div>
                    </div>
                `;
                container.appendChild(item);
            });
        };
        
        // 3. Conectar el buscador
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtered = patients.filter(p => 
                p.nombre_completo.toLowerCase().includes(query) || 
                (p.rfc && p.rfc.toLowerCase().includes(query))
            );
            renderPatientList(filtered);
        });

        // 4. Renderizado inicial
        renderPatientList(patients);
    }

      // --- FIN DEL BLOQUE 5 ---

      // ---------- 9. MÓDULO PÁGINA DE HISTORIAL (REESCRITO) ----------

    /**
     * MÓDULO: Página de Historial (historial.html)
     * Se encarga de cargar y mostrar la lista de pacientes.
     */
    async function initHistoryPage() {
        const container = $('patientListContainer');
        if (!container) return; // Salir si no estamos en historial.html
        
        const searchInput = $('patientSearchInput');
        
        // 1. Cargar pacientes desde la API (o caché)
        // (La función loadAllPatients ya está definida en el Bloque 3)
        const patients = await loadAllPatients();
        
        // 2. Función de renderizado
        const renderPatientList = (patientArray) => {
            container.innerHTML = '';
            if (patientArray.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--muted);">No se encontraron pacientes.</p>';
                return;
            }
            patientArray.forEach(p => {
                const item = document.createElement('a');
                item.className = 'patient-list-item';
                item.href = `paciente_full.html?pid=${p.id}`; // ID de la BD
                item.innerHTML = `
                    <div class="patient-info">
                        <!-- Usamos la clave 'nombre_completo' de la BD -->
                        <div class="patient-list-name">${p.nombre_completo}</div>
                        <div class="patient-list-curp"><strong>RFC:</strong> ${p.rfc || 'No registrado'}</div>
                    </div>
                `;
                container.appendChild(item);
            });
        };
        
        // 3. Conectar el buscador
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            const filtered = patients.filter(p => 
                p.nombre_completo.toLowerCase().includes(query) || 
                (p.rfc && p.rfc.toLowerCase().includes(query))
            );
            renderPatientList(filtered);
        });

        // 4. Renderizado inicial
        renderPatientList(patients);
    }
    
    // ---------- 10. MÓDULO DE AGENDA (REESCRITO) ----------

    // Estado global para guardar los datos de la agenda
    let allAppointments = [];
    let allBlockedSlots = [];
    // (allPatients ya es global, lo cargaremos aquí)

    /**
     * MÓDULO: Agenda y Calendario (agenda.html)
     * Se encarga de toda la lógica de la página principal.
     */
    async function initCalendarModule() {
        const cal = $('calendar');
        if (!cal) return; // Salir si no estamos en agenda.html

        try {
            // 1. Cargar todos los datos de la agenda desde la API
            const data = await getAPI(`${API_AGENDA}?action=get_all`);
            if (!data.success) throw new Error(data.error);
            
            // Guardamos los datos en el estado global
            // (Usamos los nombres en español que definimos en la BD/API)
            allAppointments = data.citas || [];
            allBlockedSlots = data.bloqueos || [];
            allPatients = data.pacientes || []; // Esto actualiza la lista de pacientes
            
        } catch (e) {
            console.error("Error al cargar datos de agenda: ", e);
            showMessage(e.message || "Error crítico al cargar la agenda.", "error");
            return;
        }
        
        // --- Referencias a elementos del DOM ---
        const container = document.querySelector('.layout-agenda'); // Contenedor principal
        const prev = $('prevMonth'), next = $('nextMonth'), monthLabel = $('monthLabel'), yearLabel = $('yearLabel');
        const selectedDateLabel = $('selectedDateLabel'), eventsCol = $('eventsColumn');
        const quickModal = $('quickModal'), qInput = $('quickModalInput'), qTitle = $('quickModalTitle'), 
            qOk = $('quickModalOk'), qCancel = $('quickModalCancel'), qClose = $('closeQuickModal');
        
        let pendingBooking = null; // Para el modal de cita rápida
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let viewDate = new Date();
        viewDate.setHours(0,0,0,0);
        let timeIndicatorInterval = null; // Para la línea de "hora actual"

        // --- Funciones del Modal Rápido ---
        function openQuickModal(dateISO, hour) {
            pendingBooking = { dateISO, hour };
            const date = new Date(dateISO + 'T00:00:00');
            const formattedDate = date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            qTitle.textContent = `Agendar cita para el ${formattedDate} a las ${hour}`;
            qInput.value = '';
            quickModal.classList.remove('hidden');
            qInput.focus();
        }
        function closeQuickModal() {
            pendingBooking = null;
            quickModal.classList.add('hidden');
        }
        
        qOk.addEventListener('click', () => {
            const name = qInput.value.trim();
            if (!name) { 
                showMessage('Ingresa el nombre del paciente', 'warning'); 
                qInput.focus(); 
                return; 
            }
            const bookingDetails = { ...pendingBooking };
            closeQuickModal();
            finalizeQuickBook(bookingDetails.dateISO, bookingDetails.hour, name);
        });
        qCancel.addEventListener('click', closeQuickModal);
        qClose.addEventListener('click', closeQuickModal);
        qInput.addEventListener('keydown', e => { if (e.key === 'Enter') qOk?.click(); });

        // --- Funciones de Renderizado del Calendario ---
        function buildCalendar() {
            const viewYear = viewDate.getFullYear();
            const viewMonth = viewDate.getMonth();
            cal.innerHTML = '';
            const first = new Date(viewYear, viewMonth, 1);
            const startIndex = first.getDay(); 
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const firstVisible = new Date(viewYear, viewMonth, 1 - startIndex);
            const totalCells = Math.ceil((startIndex + daysInMonth) / 7) * 7;

            for (let i = 0; i < totalCells; i++) {
                const d = new Date(firstVisible);
                d.setDate(firstVisible.getDate() + i);
                const iso = d.toISOString().slice(0,10);
                const cell = document.createElement('div');
                cell.className = `cell ${d.getMonth() !== viewMonth ? 'otherMonth' : ''} ${iso === today.toISOString().slice(0,10) ? 'today' : ''}`;
                cell.dataset.iso = iso;
                cell.innerHTML = `<div class="dateChip">${d.getDate()}</div><div class="event-dots"></div>`;
                cell.addEventListener('click', () => onCellClick(cell.dataset.iso));
                cal.appendChild(cell);
            }
            monthLabel.textContent = new Date(viewYear, viewMonth, 1).toLocaleString('es-ES', { month: 'long' });
            yearLabel.textContent = viewYear;
            paintDots();
        }
        
        function paintDots() {
            const counts = {};
            // Usamos el campo 'fecha' de la BD
            allAppointments.forEach(a => counts[a.fecha] = (counts[a.fecha] || 0) + 1);
            cal.querySelectorAll('.cell').forEach(cell => {
                const dots = cell.querySelector('.event-dots');
                if(dots) {
                    dots.innerHTML = '';
                    const cnt = counts[cell.dataset.iso] || 0;
                    for (let i = 0; i < Math.min(cnt, 3); i++) dots.innerHTML += '<div class="dot"></div>';
                }
            });
        }

        function onCellClick(iso) {
            const localDate = new Date(iso + 'T00:00:00');
            localDate.setHours(0,0,0,0);
            
            // --- ¡AQUÍ ESTÁ TU LÓGICA ORIGINAL! ---
            // No permite seleccionar fechas pasadas
            if(localDate < today) {
                showMessage('No puedes seleccionar fechas pasadas. Por favor, elige una fecha a partir de hoy.', 'warning');
                return;
            }
            // --- FIN DE LA LÓGICA ---
            
            container.querySelector('.day-view-active')?.classList.remove('day-view-active');
            container.classList.add('day-view-active');

            cal.querySelector('.cell.selected')?.classList.remove('selected');
            cal.querySelector(`.cell[data-iso="${iso}"]`)?.classList.add('selected');
            selectedDateLabel.textContent = localDate.toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
            loadDayView(iso);
            updateCurrentTimeIndicator();
        }

        // --- Funciones de Renderizado de la Vista Diaria ---
        function workingHours(dow) {
            if (dow >= 1 && dow <= 5) return ['15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
            if (dow === 6) return ['08:00','09:00','10:00','11:00'];
            if (dow === 0) return ['07:00','08:00','09:00','10:00','11:00','12:00'];
            return [];
        }

        function loadDayView(dateISO) {
            clearInterval(timeIndicatorInterval);
            eventsCol.innerHTML = '';
            const dow = new Date(dateISO + 'T00:00:00').getDay();
            const hours = workingHours(dow);
            
            if (hours.length === 0) {
                eventsCol.innerHTML = '<div class="empty">No hay horarios de consulta disponibles para este día.</div>';
                return;
            }

            // Usamos los nombres de columna en español
            const apptsThisDay = allAppointments.filter(a => a.fecha === dateISO);
            const blockedThisDay = allBlockedSlots.filter(b => b.fecha === dateISO);
            const localDate = new Date(dateISO + 'T00:00:00');

            hours.forEach(h => {
                const hourStr = h + ":00"; // Formato HH:MM:SS para comparar con la BD
                const ap = apptsThisDay.find(a => a.hora === hourStr);
                const blocked = blockedThisDay.some(b => b.hora === hourStr);
                const row = document.createElement('div');
                row.className = 'event-item';
                
                if (ap) {
                    // Usamos 'id_paciente' de la BD
                    const p = allPatients.find(pp => pp.id == ap.id_paciente);
                    if (ap.estado === 'completada') row.classList.add('completed');
                    row.innerHTML = `<div class="event-time">${h}</div><div class="event-body"><div class="event-patient" data-pid="${ap.id_paciente}">${p?.nombre_completo || 'Paciente (Error)'}</div></div><div class="inline-actions-slot"></div>`;
                    
                    row.querySelector('.event-patient').addEventListener('click', ev => window.location.href = `paciente_full.html?pid=${ev.currentTarget.dataset.pid}`);
                    const slot = row.querySelector('.inline-actions-slot');
                    
                    if (ap.estado === 'completada') {
                        slot.innerHTML = '<button class="action-chip success" disabled>Finalizada</button>';
                    } else {
                        const btnFinish = document.createElement('button'); btnFinish.className = 'action-chip success'; btnFinish.textContent = 'Finalizar'; btnFinish.onclick = () => finishAp(ap); slot.appendChild(btnFinish);
                        const btnDel = document.createElement('button'); btnDel.className = 'action-chip danger'; btnDel.textContent = 'Eliminar'; btnDel.onclick = () => deleteAp(ap); slot.appendChild(btnDel);
                    }
                } else if (blocked) {
                    row.innerHTML = `<div class="event-time">${h}</div><div class="event-body"><div class="event-note" style="color: var(--danger);">Horario Bloqueado</div></div><div class="inline-actions-slot"></div>`;
                    const btn = document.createElement('button');
                    btn.className = 'action-chip';
                    btn.textContent = 'Desbloquear';
                    btn.onclick = () => toggleBlock(dateISO, hourStr);
                    row.querySelector('.inline-actions-slot').appendChild(btn);
                } else {
                    row.innerHTML = `<div class="event-time">${h}</div><div class="event-body"><div class="event-note" style="color: var(--success);">Disponible</div></div><div class="inline-actions-slot"></div>`;
                    const slot = row.querySelector('.inline-actions-slot');
                    
                    // Lógica para no agendar citas con menos de 1 hora de antelación
                    const now = new Date();
                    const bookingCutoff = new Date(now.getTime() + 3600 * 1000); // 1 hora desde ahora
                    const slotDateTime = new Date(`${dateISO}T${h}`);

                    // Tu lógica original de `bookingCutoff`
                    if (slotDateTime > bookingCutoff) {
                        const btnBook = document.createElement('button'); btnBook.className = 'action-chip primary'; btnBook.textContent = 'Agendar';
                        btnBook.onclick = () => openQuickModal(dateISO, h); 
                        slot.appendChild(btnBook);
                        
                        const btnBlock = document.createElement('button'); btnBlock.className = 'action-chip'; btnBlock.textContent = 'Bloquear'; btnBlock.onclick = () => toggleBlock(dateISO, hourStr); slot.appendChild(btnBlock);
                    } else {
                        // Si la hora ya pasó o es en menos de 1 hora, no mostrar botones
                        // (Excepto si es un día futuro)
                        if (localDate > today) {
                             const btnBook = document.createElement('button'); btnBook.className = 'action-chip primary'; btnBook.textContent = 'Agendar';
                            btnBook.onclick = () => openQuickModal(dateISO, h); 
                            slot.appendChild(btnBook);
                            
                            const btnBlock = document.createElement('button'); btnBlock.className = 'action-chip'; btnBlock.textContent = 'Bloquear'; btnBlock.onclick = () => toggleBlock(dateISO, hourStr); slot.appendChild(btnBlock);
                        }
                    }
                }
                eventsCol.appendChild(row);
            });
            
            timeIndicatorInterval = setInterval(updateCurrentTimeIndicator, 60000);
            updateCurrentTimeIndicator();
        }
        
        function updateCurrentTimeIndicator() { 
            const dayView = $('dayView');
            if (!dayView) return;
            let indicator = $('timeIndicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'timeIndicator';
                indicator.style.position = 'absolute';
                indicator.style.left = '0';
                indicator.style.right = '0';
                indicator.style.height = '2px';
                indicator.style.backgroundColor = 'var(--danger)';
                indicator.style.zIndex = '10';
                indicator.style.opacity = '0';
                indicator.style.transition = 'top 0.5s ease';
                eventsCol.appendChild(indicator);
            }

            const selectedDate = cal.querySelector('.cell.selected')?.dataset.iso;
            const todayISO = new Date().toISOString().slice(0, 10);

            if (selectedDate !== todayISO) {
                indicator.style.opacity = '0';
                return;
            }

            const hours = workingHours(new Date().getDay());
            if (hours.length === 0) {
                indicator.style.opacity = '0';
                return;
            }

            const parseTime = t => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
            const now = new Date();
            const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
            
            const firstHourInMinutes = parseTime(hours[0]);
            
            const totalHeight = eventsCol.scrollHeight;
            const totalHours = hours.length;
            const totalMinutesDisplayed = totalHours * 60;
            
            const minutesPassed = currentTimeInMinutes - firstHourInMinutes;
            
            if (minutesPassed >= 0 && minutesPassed <= totalMinutesDisplayed) {
                const percentage = (minutesPassed / totalMinutesDisplayed) * 100;
                indicator.style.top = `${percentage}%`;
                indicator.style.opacity = '0.75';
            } else {
                indicator.style.opacity = '0';
            }
        }

        async function reloadAgenda(dateISO) {
            try {
                const data = await getAPI(`${API_AGENDA}?action=get_all`);
                if (!data.success) throw new Error(data.error);
                allAppointments = data.citas || [];
                allBlockedSlots = data.bloqueos || [];
                allPatients = data.pacientes || [];
                paintDots();
                if(dateISO) loadDayView(dateISO);
                updateDashboardStats();
            } catch (e) {
                showMessage(e.message || 'No se pudo resincronizar la agenda.', 'error');
            }
        }

        async function finalizeQuickBook(dateISO, hour, patientName) {
            let patient = allPatients.find(p => p.nombre_completo.toLowerCase() === patientName.toLowerCase());
            let patientId;

            if (patient) {
                patientId = patient.id;
            } else {
                const confirmed = await showConfirm('Paciente no encontrado', `No se encontró a "${patientName}". ¿Quieres crear un nuevo paciente con este nombre y agendar la cita?`);
                if (!confirmed) return;
                
                try {
                    const newPatientData = {
                        action: 'create',
                        patient: {
                            nombre: patientName,
                            apellido_paterno: '(Sin apellido)',
                            apellido_materno: '',
                            nombre_completo: patientName,
                            fecha_nacimiento: '1900-01-01',
                        }
                    };
                    const pData = await postAPI(API_PACIENTES, newPatientData);
                    if (!pData.success) throw new Error(pData.error);
                    patientId = pData.newId;
                    await loadAllPatients(true);
                } catch (e) {
                    showMessage(e.message || 'No se pudo crear el paciente.', 'error');
                    return;
                }
            }
            
            const data = await postAPI(API_AGENDA, {
                action: 'create_appt',
                id_paciente: patientId,
                fecha: dateISO,
                hora: hour + ":00"
            });

            if (data.success) {
                showMessage(data.message, 'success');
                reloadAgenda(dateISO);
            } else {
                showMessage(data.error || 'No se pudo crear la cita.', 'error');
            }
        }
        
        async function toggleBlock(dateISO, time) {
            const data = await postAPI(API_AGENDA, {
                action: 'toggle_block',
                fecha: dateISO,
                hora: time
            });
            
            if (data.success) {
                showMessage(data.message, 'success');
                reloadAgenda(dateISO);
            } else {
                showMessage(data.error, 'error');
            }
        }

        async function deleteAp(appt) {
            const p = allPatients.find(pp => pp.id == appt.id_paciente);
            const patientName = p?.nombre_completo || 'este paciente';
            
            const confirmed = await showConfirm('Eliminar Cita', `¿Seguro que quieres eliminar la cita de ${patientName} (${appt.fecha} ${appt.hora})? El horario se desbloqueará.`);
            if (!confirmed) return;

            const data = await postAPI(API_AGENDA, {
                action: 'delete_appt',
                id: appt.id
            });
            
            if (data.success) {
                showMessage(data.message, 'success');
                reloadAgenda(appt.fecha);
            } else {
                showMessage(data.error, 'error');
            }
        }
        
        async function finishAp(appt) {
            const confirmed = await showConfirm('Finalizar Cita', '¿Marcar esta cita como finalizada?');
            if (!confirmed) return;
            
            const data = await postAPI(API_AGENDA, {
                action: 'complete_appt',
                id: appt.id
            });
            
            if (data.success) {
                showMessage(data.message, 'success');
                reloadAgenda(appt.fecha);
            } else {
                showMessage(data.error, 'error');
            }
        }

        // Esta es tu función original de "Dashboard Stats"
        function updateDashboardStats() {
            const todayCountEl = $('todayCount');
            const blockedCountEl = $('blockedCount');
            const nextApptEl = $('nextAppt');
            if (!todayCountEl) return;

            const todayISO = new Date().toISOString().slice(0, 10);
            
            const todayAppointments = allAppointments.filter(a => a.fecha === todayISO);
            todayCountEl.textContent = todayAppointments.length;
            const todayBlocked = allBlockedSlots.filter(b => b.fecha === todayISO);
            blockedCountEl.textContent = todayBlocked.length;

            const now = new Date();
            const upcomingAppointments = allAppointments
                .filter(a => a.estado === 'activa' && new Date(a.fecha + 'T' + a.hora) >= now)
                .sort((a, b) => (new Date(a.fecha + 'T' + a.hora) - new Date(b.fecha + 'T' + b.hora)));

            if (upcomingAppointments.length > 0) {
                const next = upcomingAppointments[0];
                const patient = allPatients.find(p => p.id == next.id_paciente);
                const nextDate = new Date(next.fecha + 'T' + next.hora);
                
                let dateString;
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);

                if (next.fecha === todayISO) {
                    dateString = 'Hoy';
                } else if (next.fecha === tomorrow.toISOString().slice(0, 10)) {
                    dateString = 'Mañana';
                } else {
                    dateString = nextDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });
                }
                nextApptEl.textContent = `${patient ? patient.nombre_completo : 'Paciente'} - ${dateString} a las ${next.hora.slice(0, 5)}`;
            } else {
                nextApptEl.textContent = 'No hay citas próximas.';
            }
        }

        // --- INICIALIZACIÓN DEL MÓDULO DE AGENDA ---
        prev?.addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); buildCalendar(); });
        next?.addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); buildCalendar(); });
        
        buildCalendar();
        updateDashboardStats(); // Carga las estadísticas al inicio
    }
    
      // --- FIN DEL BLOQUE 6 ---

      // ---------- 11. MÓDULO PÁGINA DE DETALLE (REESCRITO) ----------
    
    /**
     * MÓDULO: Página de Detalle de Paciente (paciente_full.html)
     * Se encarga de cargar y mostrar TODOS los datos de un paciente.
     */
    async function initPatientDetailPage() {
        // Obtenemos referencias a todos los elementos de la página
        const patientNameHeader = $('patientNameHeader');
        const patientKeyInfoEl = $('patientKeyInfo');
        const patientInfoEl = $('patientInfo');
        const patientHistoryEl = $('patientHistory');
        const editPatientLink = $('editPatientLink');
        const createParteMedicoLink = $('createParteMedicoLink');
        const printHistoryBtn = $('printHistoryBtn');
        const dangerZoneEl = $('dangerZone');
        const deletePatientBtn = $('deletePatientBtn');

        // Si no estamos en la página correcta, salimos
        if (!patientKeyInfoEl) return;

        // 1. Obtener el ID del paciente desde la URL (ej. ...?pid=123)
        const params = new URL(window.location.href).searchParams;
        const patientId = params.get('pid');
        if (!patientId) {
            patientNameHeader.textContent = "Error";
            patientInfoEl.innerHTML = '<p class="message error">No se especificó un ID de paciente.</p>';
            return;
        }

        // 2. Cargar los datos del paciente y su historial (en paralelo)
        // Llama a 'api/pacientes_api.php?action=get_one' y 'api/historial_api.php?action=get_history'
        const [patientData, historyData] = await Promise.all([
            getAPI(`${API_PACIENTES}?action=get_one&id=${patientId}`),
            getAPI(`${API_HISTORIAL}?action=get_history&id=${patientId}`)
        ]);

        // 3. Manejar error al cargar paciente
        if (!patientData.success) {
            showMessage(patientData.error || 'No se pudo cargar el paciente.', 'error');
            return;
        }
        const patient = patientData.patient; // Este ya tiene claves en español (ej. nombre_completo)

        // 4. Llenar encabezado y enlaces
        document.title = `Paciente: ${patient.nombre_completo}`;
        patientNameHeader.textContent = patient.nombre_completo;
        editPatientLink.href = `paciente.html?edit=${patient.id}`;
        createParteMedicoLink.href = `parte_medico.html?pid=${patient.id}`;
        
        // 5. Llenar Barra de Información Clave
        const displayAge = patient.edad || calculateAge(patient.fecha_nacimiento);
        patientKeyInfoEl.innerHTML = `
            <div class="key-item"><strong>Edad:</strong> ${displayAge || '—'}</div>
            <div class="key-item"><strong>Sexo:</strong> ${patient.sexo || '—'}</div>
            <div class="key-item"><strong>Teléfono:</strong> ${patient.telefono || '—'}</div>
            <div class="key-item"><strong>RFC:</strong> ${patient.rfc || '—'}</div>
        `;
        
        // 6. Llenar Columna de Antecedentes
        let surgeriesHtml = '<span>—</span>';
        if (Array.isArray(patient.cirugias_previas) && patient.cirugias_previas.length > 0) {
            surgeriesHtml = '<ul>' + patient.cirugias_previas.map(s => 
                `<li><strong>${s.date || 'N/A'}:</strong> ${s.procedure || 'N/A'} <em>${s.complication ? '(Complicaciones: ' + s.complication + ')' : ''}</em></li>`
            ).join('') + '</ul>';
        }

        const substanceDetail = (patient.consumo_sustancias && patient.consumo_sustancias !== 'No')
            ? (patient.detalle_sustancias?.name ? `Sí (${patient.detalle_sustancias.name} - ${patient.detalle_sustancias.frequency || 'N/A'})` : 'Sí')
            : 'No';

        patientInfoEl.innerHTML = `
            <h3 class="column-title">Antecedentes Médicos</h3>
            <div class="data-group">
                <strong>Alergias:</strong>
                <span>${(patient.alergias && patient.alergias.length) ? patient.alergias.join(', ') : '—'}</span>
            </div>
            <div class="data-group">
                <strong>Enfermedades Crónicas:</strong>
                <span>${(patient.enfermedades_cronicas && patient.enfermedades_cronicas.length) ? patient.enfermedades_cronicas.join(', ') : '—'}</span>
            </div>
            <div class="data-group">
                <strong>Medicación Actual:</strong>
                <span>${(patient.medicamentos_actuales && patient.medicamentos_actuales.length) ? patient.medicamentos_actuales.join(', ') : '—'}</span>
            </div>
            <div class="data-group">
                <strong>Cirugías Previas:</strong>
                ${surgeriesHtml}
            </div>
            <div class="data-group">
                <strong>Consumo de Sustancias:</strong>
                <span>${substanceDetail}</span>
            </div>
            <div class="data-group">
                <strong>Motivo de Consulta Inicial:</strong>
                <span>${patient.motivo_consulta || '—'}</span>
            </div>
            <div class="data-group">
                <strong>Síntomas Iniciales:</strong>
                <span>${patient.sintomas || '—'}</span>
            </div>
        `;

        // 7. Llenar Historial de Actividad
        if (!historyData.success) {
            patientHistoryEl.innerHTML = '<p class="message error">No se pudo cargar el historial.</p>';
        } else {
            const history = historyData.history; // Este ya tiene claves genéricas (type, data, etc.)
            if (history.length === 0) {
                patientHistoryEl.innerHTML = '<p style="text-align: center; color: var(--muted); padding-top: 2rem;">No hay historial de actividad para este paciente.</p>';
            } else {
                // Función auxiliar local para organizar el historial
                const renderHistorySection = (title, events) => {
                    if (!events || events.length === 0) return '';
                    const eventsHtml = events.map(h => formatHistoryEntry(h)).join('');
                    return `<h4 class="history-section-title">${title}</h4>${eventsHtml}`;
                };
                
                patientHistoryEl.innerHTML = [
                    renderHistorySection('Recetas Emitidas', history.filter(h => h.type === 'Receta emitida')),
                    renderHistorySection('Diagnósticos', history.filter(h => h.type === 'Diagnóstico')),
                    renderHistorySection('Estudios Médicos', history.filter(h => h.type === 'Estudio Médico')),
                    renderHistorySection('Partes Médicos', history.filter(h => h.type === 'Parte Médico')),
                    renderHistorySection('Registros de Pago', history.filter(h => h.type === 'Registro de Pago')),
                    renderHistorySection('Actividad de Citas', history.filter(h => ['Cita agendada', 'Cita eliminada', 'Cita finalizada'].includes(h.type))),
                ].join('');
            }
        }
        
        // 8. Conectar botones de reimpresión (usa delegación de eventos)
        patientHistoryEl.addEventListener('click', e => {
            const target = e.target.closest('button.reprint-btn');
            if (!target) return; // No es un botón de reimpresión
            
            const historyId = target.dataset.historyId;
            const historyItem = historyData.history.find(h => h.id == historyId);
            
            if (historyItem) {
                reprintItem(patient, historyItem); // Enviamos el paciente completo
            }
        });
        
        // 9. Conectar Zona de Peligro
        dangerZoneEl.style.display = 'block';
        deletePatientBtn.addEventListener('click', () => handleDeletePatient(patient.id, patient.nombre_completo));
        
        // 10. Conectar Botón de Imprimir Historial
        printHistoryBtn.addEventListener('click', () => {
             generateHistoryPrintWindow(patient, historyData.history);
        });
    }

    /**
     * Función auxiliar para formatear una entrada de historial
     * (Usada solo por initPatientDetailPage)
     */
    function formatHistoryEntry(h) {
        // h usa claves genéricas (type, data, etc.) porque la API (historial_api.php) las tradujo
        const { id, patientId, type, data, timestamp } = h;
        let content = '';
        let titleText = type;
        
        // Función de escape simple para evitar inyección de HTML
        const esc = (s='') => String(s||'').replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;','&':'&amp;'})[c]);

        // Botón de Reimpresión/Ver
        const reprintButton = `<button class="action-chip primary reprint-btn" data-history-id="${id}">Ver/Imprimir</button>`;
        
        // Botón de Editar
        const editBaseUrl = {
            'Receta emitida': 'receta.html',
            'Parte Médico': 'parte_medico.html',
            'Diagnóstico': 'diagnostico.html',
            'Estudio Médico': 'estudio.html',
            'Registro de Pago': 'pago.html',
        };
        const editUrl = editBaseUrl[type] ? `${editBaseUrl[type]}?edit_hid=${id}&pid=${patientId}` : null;
        const editButton = editUrl ? `<a href="${editUrl}" class="action-chip" style="margin-left: 8px;">Editar</a>` : '';

        // Creamos el HTML para cada tipo de registro
        switch (type) {
            case 'Receta emitida': {
                const medsList = (data.medications || []).map(med => `<li><strong>${esc(med.name)} ${esc(med.dose)}</strong> - ${esc(med.freq)} por ${esc(med.dur)}</li>`).join('');
                const recommendations = data.recommendations ? `<p style="margin-top:10px;"><strong>Recomendaciones:</strong> ${esc(data.recommendations)}</p>` : '';
                content = `<ul style="margin-top: 8px; padding-left: 20px;">${medsList}</ul>${recommendations}<div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Parte Médico': {
                titleText = "Parte Médico";
                const details = data.diagnostico || 'Sin detalles';
                content = `<p><strong>Diagnóstico:</strong> ${esc(details).substring(0, 100)}...</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Diagnóstico': {
                titleText = data.title || "Diagnóstico";
                content = `<p><strong>Descripción:</strong> ${esc(data.description).substring(0, 100)}...</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Estudio Médico': {
                titleText = data.type || "Estudio Médico";
                content = `<p><strong>Parte del Cuerpo:</strong> ${esc(data.bodyPart)} (${esc(data.date)})</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Registro de Pago': {
                content = `<p><strong>Concepto:</strong> ${esc(data.concept)}</p><p><strong>Monto:</strong> $${esc(data.amount)} (${esc(data.method)})</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Cita agendada': content = `Fecha: ${data.fecha}, Hora: ${data.hora}`; break;
            case 'Cita eliminada': content = `Cita cancelada (Fecha: ${data.fecha}, Hora: ${data.hora})`; break;
            case 'Cita finalizada': content = `Consulta (Fecha: ${data.fecha}, Hora: ${data.hora})`; break;
            default: content = 'Acción registrada.';
        }
        
        return `
            <div class="history-entry">
                <strong>${esc(titleText)}</strong> 
                <span style="font-size: 0.85rem; color: #555;">— ${new Date(timestamp).toLocaleString('es-ES',{dateStyle:'full', timeStyle:'short'})}</span>
                <div>${content}</div>
            </div>`;
    }

    /**
     * Función auxiliar para borrar un paciente
     * (Usada solo por initPatientDetailPage)
     */
    async function handleDeletePatient(patientId, patientName) {
        const confirmed1 = await showConfirm('¿Eliminar Paciente?', `Estás a punto de eliminar a ${patientName}. Se borrará todo su historial, citas y pagos. Esta acción es PERMANENTE.`);
        if (!confirmed1) return;
        
        const confirmed2 = await showPrompt('Confirmación Final', `Para confirmar, escribe "BORRAR ${patientName}".`);
        if (confirmed2 !== `BORRAR ${patientName}`) {
            showMessage('La confirmación no coincide. Acción cancelada.', 'warning');
            return;
        }

        // Llamamos a la API para borrar
        const data = await postAPI(API_PACIENTES, {
            action: 'delete',
            id: patientId
        });

        if (data.success) {
            showMessage('Paciente eliminado. Serás redirigido al historial.', 'success', 4000);
            await loadAllPatients(true); // Forzar recarga del caché
            setTimeout(() => {
                window.location.href = 'historial.html';
            }, 1500);
        } else {
            showMessage(data.error || 'No se pudo eliminar al paciente.', 'error');
        }
    }

        // --- FIN DEL BLOQUE 7 ---

        // ---------- 11. MÓDULOS DE FORMULARIOS DE HISTORIAL (REESCRITOS) ----------

    /**
     * MÓDULO: Formulario de Receta (receta.html)
     */
    async function initRecetaPage() {
        const form = $('prescriptionForm');
        if (!form) return; // Salir si no estamos en receta.html

        const medicationsContainer = $('medicationsContainer');
        const recommendationsInput = $('recommendations');
        const patientSelect = $('patientSelect');
        const params = new URL(window.location.href).searchParams;
        
        let patientIdParam = params.get('pid'); 
        const editHistoryId = params.get('edit_hid');

        // Si tenemos un edit_hid pero no un pid (ej. enlace directo)
        if (editHistoryId && !patientIdParam) {
            // Llamamos a la API para averiguar a qué paciente pertenece este historial
            const data = await getAPI(`${API_HISTORIAL}?action=find_patient&hid=${editHistoryId}`);
            if(data.success) {
                patientIdParam = data.patientId;
            }
        }

        // Llenamos el <select> de pacientes y pre-seleccionamos si hay un ID
        await populatePatientSelect('patientSelect', patientIdParam);

        // Lógica para añadir/quitar bloques de medicamentos
        const addMedicationBlock = (data = {}) => {
            const medId = 'med_' + Math.random().toString(36).slice(2, 9);
            const block = document.createElement('div');
            block.className = 'medication-group';
            block.id = medId;
            block.innerHTML = `
                <button type="button" class="btn danger" data-med-id="${medId}" style="position:absolute; top:10px; right:10px; padding: 2px 8px; font-size: 14px;">×</button>
                <label class="required">Medicamento<input type="text" class="med-name" required placeholder="Ej. Amoxicilina" value="${data.name || ''}"></label>
                <div class="grid-2">
                    <label>Dosis<input type="text" class="med-dose" placeholder="Ej. 500 mg" value="${data.dose || ''}"></label>
                    <label>Presentación<input type="text" class="med-form" placeholder="Ej. Cápsulas" value="${data.form || ''}"></label>
                </div>
                <div class="grid-2">
                    <label class="required">Frecuencia<input type="text" class="med-freq" required placeholder="Ej. Cada 8 horas" value="${data.freq || ''}"></label>
                    <label class="required">Duración<input type="text" class="med-dur" required placeholder="Ej. Por 7 días" value="${data.dur || ''}"></label>
                </div>
                <label>Indicaciones adicionales<textarea class="med-instr" rows="2" placeholder="Ej. Tomar con alimentos">${data.instr || ''}</textarea></label>`;
            medicationsContainer.appendChild(block);
        };
        $('addMedicationBtn').addEventListener('click', () => addMedicationBlock());
        medicationsContainer.addEventListener('click', e => {
            if (e.target.dataset.medId) {
                $(e.target.dataset.medId)?.remove();
            }
        });

        // Revisar si estamos en MODO EDICIÓN
        if (editHistoryId) {
            document.title = "Editar Receta Médica";
            form.querySelector('button[type="submit"]').textContent = 'Actualizar Receta';
            
            // Cargamos el historial de este paciente
            const data = await getAPI(`${API_HISTORIAL}?action=get_history&id=${patientIdParam}`);
            if (data.success) {
                const historyItem = data.history.find(h => h.id == editHistoryId);
                if (historyItem && historyItem.type === 'Receta emitida') {
                    const d = historyItem.data; // Los datos de la receta
                    patientSelect.value = patientIdParam;
                    patientSelect.disabled = true; // No se puede cambiar el paciente al editar
                    recommendationsInput.value = d.recommendations || '';
                    medicationsContainer.innerHTML = ''; // Limpiar el bloque vacío
                    if (d.medications && d.medications.length > 0) {
                        d.medications.forEach(med => addMedicationBlock(med));
                    } else {
                        addMedicationBlock(); // Añadir uno vacío si no hay
                    }
                }
            } else {
                 showMessage(data.error || 'No se pudo cargar la receta para editar.', 'error');
            }
        } else {
            // MODO CREACIÓN: Añadir un bloque vacío para empezar
            addMedicationBlock();
        }

        // Manejador de envío (para Crear y Actualizar)
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> &nbsp; Guardando...';

            const patientId = patientSelect.value;
            if (!patientId) {
                showMessage('Por favor, selecciona un paciente.', 'warning');
                btn.disabled = false; btn.innerHTML = editHistoryId ? 'Actualizar Receta' : 'Guardar e Imprimir Receta';
                return;
            }

            const medications = [];
            const medGroups = medicationsContainer.querySelectorAll('.medication-group');
            if(medGroups.length === 0) {
                showMessage('Debes añadir al menos un medicamento.', 'warning');
                btn.disabled = false; btn.innerHTML = editHistoryId ? 'Actualizar Receta' : 'Guardar e Imprimir Receta';
                return;
            }
            
            let formValido = true;
            medGroups.forEach(group => {
                const name = group.querySelector('.med-name').value;
                const freq = group.querySelector('.med-freq').value;
                const dur = group.querySelector('.med-dur').value;
                if(!name || !freq || !dur) formValido = false; // Validación simple
                medications.push({
                    name: name,
                    dose: group.querySelector('.med-dose').value,
                    form: group.querySelector('.med-form').value,
                    freq: freq,
                    dur: dur,
                    instr: group.querySelector('.med-instr').value,
                });
            });

            if (!formValido) {
                showMessage('Medicamento, Frecuencia y Duración son obligatorios para cada medicamento.', 'warning');
                btn.disabled = false; btn.innerHTML = editHistoryId ? 'Actualizar Receta' : 'Guardar e Imprimir Receta';
                return;
            }

            const recipeData = {
                medications: medications,
                recommendations: recommendationsInput.value
            };

            // app.js envía 'patientId'
            const data = await postAPI(API_HISTORIAL, {
                action: 'save_item',
                patientId: patientId,
                historyId: editHistoryId || null, // Si es null, la API crea; si tiene ID, actualiza
                type: 'Receta emitida',
                data: recipeData // El objeto JSON con los datos
            });

            if (data.success) {
                showMessage(data.message, 'success');
                
                // Cargar los datos completos del paciente para la impresión
                const patientPrintData = await getAPI(`${API_PACIENTES}?action=get_one&id=${patientId}`);
                if (patientPrintData.success) {
                    generatePrintWindow(patientPrintData.patient, recipeData.medications, recipeData.recommendations);
                }

                if (editHistoryId) {
                    // Si editamos, volver al historial
                    setTimeout(() => window.location.href = `paciente_full.html?pid=${patientId}`, 1000);
                } else {
                    // Si creamos, limpiar el formulario
                    form.reset();
                    medicationsContainer.innerHTML = '';
                    addMedicationBlock();
                    patientSelect.value = '';
                    btn.disabled = false;
                    btn.innerHTML = 'Guardar e Imprimir Receta';
                }
            } else {
                showMessage(data.error || 'No se pudo guardar la receta.', 'error');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Receta' : 'Guardar e Imprimir Receta';
            }
        });
    }

    /**
     * MÓDULO: Formulario de Pago (pago.html)
     */
    async function initPaymentPage() {
        const form = $('paymentForm');
        if (!form) return;

        // Referencias del DOM
        const patientSelect = $('patientSelect');
        const paymentMethodSelect = $('paymentMethod');
        const otherContainer = $('paymentMethodOtherContainer');
        const otherInput = $('paymentMethodOther');
        const facturacionContainer = $('facturacionContainer');
        const facturadoCheckbox = $('paymentFacturado');
        const facturaEmitidaContainer = $('facturaEmitidaContainer');
        const facturaEmitidaCheckbox = $('paymentFacturaEmitida');
        
        // Obtenemos IDs de la URL
        const params = new URL(window.location.href).searchParams;
        let patientIdParam = params.get('pid');
        const editHistoryId = params.get('edit_hid');
        
        if (editHistoryId && !patientIdParam) {
            const data = await getAPI(`${API_HISTORIAL}?action=find_patient&hid=${editHistoryId}`);
            if(data.success) patientIdParam = data.patientId;
        }

        await populatePatientSelect('patientSelect', patientIdParam);

        // --- Lógica de visibilidad de campos ---
        const toggleFacturacion = () => {
            const show = paymentMethodSelect.value !== 'Efectivo';
            facturacionContainer.style.display = show ? 'block' : 'none';
            if (!show) {
                facturadoCheckbox.checked = false;
                facturadoCheckbox.dispatchEvent(new Event('change')); // Forzar actualización de 'emitida'
            }
        };
        const toggleFacturaEmitida = () => {
            const show = facturadoCheckbox.checked;
            facturaEmitidaContainer.style.display = show ? 'inline-flex' : 'none';
            if (!show) {
                facturaEmitidaCheckbox.checked = false;
            }
        };
        const toggleOtherMethod = () => {
            const show = paymentMethodSelect.value === 'Otro';
            otherContainer.style.display = show ? 'block' : 'none';
            if (!show) {
                otherInput.value = '';
            }
        };

        // Conectamos los listeners
        paymentMethodSelect.addEventListener('change', () => {
            toggleOtherMethod();
            toggleFacturacion();
        });
        facturadoCheckbox.addEventListener('change', toggleFacturaEmitida);
        // Ejecutamos al inicio
        toggleFacturacion();
        toggleFacturaEmitida();

        // --- Modo Edición ---
        if (editHistoryId) {
            document.title = "Editar Registro de Pago";
            form.querySelector('button[type="submit"]').textContent = 'Actualizar Pago';
            
            const data = await getAPI(`${API_HISTORIAL}?action=get_history&id=${patientIdParam}`);
            if (data.success) {
                const historyItem = data.history.find(h => h.id == editHistoryId);
                if (historyItem && historyItem.type === 'Registro de Pago') {
                    const d = historyItem.data;
                    patientSelect.value = patientIdParam;
                    patientSelect.disabled = true;
                    $('paymentConcept').value = d.concept || 'Consulta de Traumatología';
                    $('paymentAmount').value = d.amount || '';
                    
                    const standardMethods = ['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito/Débito'];
                    if (standardMethods.includes(d.method)) {
                        paymentMethodSelect.value = d.method;
                    } else {
                        paymentMethodSelect.value = 'Otro';
                        otherInput.value = d.method;
                    }
                    
                    facturadoCheckbox.checked = d.facturado || false;
                    facturaEmitidaCheckbox.checked = d.facturaEmitida || false;
                    
                    // Actualizamos la UI
                    toggleOtherMethod();
                    toggleFacturacion();
                    toggleFacturaEmitida();
                }
            } else {
                showMessage(data.error || 'No se pudo cargar el pago.', 'error');
            }
        }

        // --- Manejador de Envío ---
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> &nbsp; Guardando...';

            const patientId = patientSelect.value;
            if (!patientId) {
                showMessage('Por favor, selecciona un paciente.', 'warning');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Pago' : 'Guardar y Generar Recibo';
                return;
            }

            let paymentMethodValue = paymentMethodSelect.value;
            if (paymentMethodValue === 'Otro') {
                paymentMethodValue = otherInput.value.trim() || 'Otro';
            }

            const paymentData = {
                concept: $('paymentConcept').value,
                method: paymentMethodValue,
                amount: $('paymentAmount').value,
                facturado: facturadoCheckbox.checked,
                facturaEmitida: facturaEmitidaCheckbox.checked,
                createdAt: nowISO() // Guardamos la fecha del pago
            };

            const data = await postAPI(API_HISTORIAL, {
                action: 'save_item',
                patientId: patientId,
                historyId: editHistoryId || null,
                type: 'Registro de Pago',
                data: paymentData
            });

            if (data.success) {
                showMessage(data.message, 'success');
                const patientPrintData = await getAPI(`${API_PACIENTES}?action=get_one&id=${patientId}`);
                if (patientPrintData.success) {
                    generatePaymentPrintWindow(patientPrintData.patient, paymentData);
                }
                
                if (editHistoryId) {
                    setTimeout(() => window.location.href = `paciente_full.html?pid=${patientId}`, 1000);
                } else {
                    form.reset();
                    patientSelect.value = '';
                    toggleOtherMethod();
                    toggleFacturacion();
                    toggleFacturaEmitida();
                    btn.disabled = false;
                    btn.innerHTML = 'Guardar y Generar Recibo';
                }
            } else {
                showMessage(data.error || 'No se pudo guardar el pago.', 'error');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Pago' : 'Guardar y Generar Recibo';
            }
        });
    }

    /**
     * MÓDULO: Formulario de Diagnóstico (diagnostico.html)
     */
    async function initDiagnosisPage() {
        const form = $('diagnosisForm');
        if (!form) return;

        const patientSelect = $('patientSelect');
        const params = new URL(window.location.href).searchParams;
        let patientIdParam = params.get('pid');
        const editHistoryId = params.get('edit_hid');
        
        if (editHistoryId && !patientIdParam) {
            const data = await getAPI(`${API_HISTORIAL}?action=find_patient&hid=${editHistoryId}`);
            if(data.success) patientIdParam = data.patientId;
        }

        await populatePatientSelect('patientSelect', patientIdParam);
        
        if (editHistoryId) {
            document.title = "Editar Diagnóstico";
            form.querySelector('button[type="submit"]').textContent = 'Actualizar Diagnóstico';
            
            const data = await getAPI(`${API_HISTORIAL}?action=get_history&id=${patientIdParam}`);
            if (data.success) {
                const historyItem = data.history.find(h => h.id == editHistoryId);
                if (historyItem && historyItem.type === 'Diagnóstico') {
                    const d = historyItem.data;
                    patientSelect.value = patientIdParam;
                    patientSelect.disabled = true;
                    $('diagnosisTitle').value = d.title || '';
                    $('diagnosisDescription').value = d.description || '';
                }
            } else {
                showMessage(data.error || 'No se pudo cargar el diagnóstico.', 'error');
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> &nbsp; Guardando...';

            const patientId = patientSelect.value;
            const diagnosisTitle = $('diagnosisTitle').value;
            if (!patientId || !diagnosisTitle) {
                showMessage('Paciente y Diagnóstico Principal son obligatorios.', 'warning');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Diagnóstico' : 'Guardar e Imprimir Diagnóstico';
                return;
            }

            const diagnosisData = {
                title: diagnosisTitle,
                description: $('diagnosisDescription').value,
                createdAt: nowISO()
            };

            const data = await postAPI(API_HISTORIAL, {
                action: 'save_item',
                patientId: patientId,
                historyId: editHistoryId || null,
                type: 'Diagnóstico',
                data: diagnosisData
            });

            if (data.success) {
                showMessage(data.message, 'success');
                const patientPrintData = await getAPI(`${API_PACIENTES}?action=get_one&id=${patientId}`);
                if (patientPrintData.success) {
                    generateDiagnosisPrintWindow(patientPrintData.patient, diagnosisData);
                }
                
                if (editHistoryId) {
                    setTimeout(() => window.location.href = `paciente_full.html?pid=${patientId}`, 1000);
                } else {
                    form.reset();
                    patientSelect.value = '';
                    btn.disabled = false;
                    btn.innerHTML = 'Guardar e Imprimir Diagnóstico';
                }
            } else {
                showMessage(data.error || 'No se pudo guardar el diagnóstico.', 'error');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Diagnóstico' : 'Guardar e Imprimir Diagnóstico';
            }
        });
    }

    /**
     * MÓDULO: Formulario de Estudio (estudio.html)
     */
    async function initStudyPage() {
        const form = $('studyForm');
        if (!form) return;

        const patientSelect = $('patientSelect');
        const imageInput = $('studyImages');
        const previewsContainer = $('imagePreviews');
        let existingImages = []; // Almacena imágenes (Base64) ya guardadas

        const params = new URL(window.location.href).searchParams;
        let patientIdParam = params.get('pid');
        const editHistoryId = params.get('edit_hid');
        
        if (editHistoryId && !patientIdParam) {
            const data = await getAPI(`${API_HISTORIAL}?action=find_patient&hid=${editHistoryId}`);
            if(data.success) patientIdParam = data.patientId;
        }

        await populatePatientSelect('patientSelect', patientIdParam);

        const renderPreviews = () => {
            previewsContainer.innerHTML = '';
            existingImages.forEach((imgData, index) => {
                const imgContainer = document.createElement('div');
                imgContainer.style = "position: relative; display: inline-block; border: 1px solid var(--border); border-radius: 4px; padding: 4px; background: white;";
                imgContainer.innerHTML = `
                    <img src="${imgData}" style="max-width: 100px; max-height: 100px; border-radius: 4px; margin: 5px;" />
                    <button type="button" class="btn danger" data-index="${index}" style="position: absolute; top: 0; right: 0; padding: 2px 5px; font-size: 10px; line-height: 1;">X</button>
                `;
                previewsContainer.appendChild(imgContainer);
            });
        };

        previewsContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.dataset.index) {
                existingImages.splice(e.target.dataset.index, 1); // Elimina la imagen del array
                renderPreviews(); // Vuelve a renderizar las vistas previas
            }
        });
        
        if (editHistoryId) {
            document.title = "Editar Estudio Médico";
            form.querySelector('button[type="submit"]').textContent = 'Actualizar Estudio';
            
            const data = await getAPI(`${API_HISTORIAL}?action=get_history&id=${patientIdParam}`);
            if (data.success) {
                const historyItem = data.history.find(h => h.id == editHistoryId);
                if (historyItem && historyItem.type === 'Estudio Médico') {
                    const d = historyItem.data;
                    patientSelect.value = patientIdParam;
                    patientSelect.disabled = true;
                    $('studyDate').value = d.date || '';
                    $('studyType').value = d.type || '';
                    $('bodyPart').value = d.bodyPart || '';
                    $('studyFindings').value = d.findings || '';
                    existingImages = [...(d.images || [])];
                    renderPreviews();
                }
            } else {
                 showMessage(data.error || 'No se pudo cargar el estudio.', 'error');
            }
        }

        form.addEventListener('submit', async e => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> &nbsp; Guardando...';

            const patientId = patientSelect.value;
            if (!patientId) {
                showMessage('Por favor, selecciona un paciente.', 'warning');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Estudio' : 'Guardar Estudio';
                return;
            }

            // Convertir solo los *nuevos* archivos a Base64
            const newFiles = Array.from(imageInput.files);
            if (existingImages.length + newFiles.length > 4) {
                showMessage('Solo puedes tener un máximo de 4 imágenes por estudio.', 'warning');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Estudio' : 'Guardar Estudio';
                return;
            }
            
            const newImagePromises = newFiles.map(file => {
                return new Promise((resolve, reject) => {
                    if (file.size > 2 * 1024 * 1024) { // Límite de 2MB
                        reject(new Error(`La imagen "${file.name}" es muy grande (máx 2MB).`));
                    }
                    const reader = new FileReader();
                    reader.onload = event => resolve(event.target.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
            });

            let newImageBase64Strings = [];
            try {
                newImageBase64Strings = await Promise.all(newImagePromises);
            } catch (error) {
                showMessage(error.message, 'error');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Estudio' : 'Guardar Estudio';
                return;
            }
            
            const allImages = [...existingImages, ...newImageBase64Strings]; 

            const studyData = {
                date: $('studyDate').value,
                type: $('studyType').value,
                bodyPart: $('bodyPart').value,
                findings: $('studyFindings').value,
                images: allImages,
                createdAt: nowISO()
            };

            const data = await postAPI(API_HISTORIAL, {
                action: 'save_item',
                patientId: patientId,
                historyId: editHistoryId || null,
                type: 'Estudio Médico',
                data: studyData
            });

            if (data.success) {
                showMessage(data.message, 'success');
                const patientPrintData = await getAPI(`${API_PACIENTES}?action=get_one&id=${patientId}`);
                if (patientPrintData.success) {
                    generateStudyPrintWindow(patientPrintData.patient, studyData);
                }
                
                if (editHistoryId) {
                    setTimeout(() => window.location.href = `paciente_full.html?pid=${patientId}`, 1000);
                } else {
                    form.reset();
                    previewsContainer.innerHTML = '';
                    existingImages = [];
                    patientSelect.value = '';
                    btn.disabled = false;
                    btn.innerHTML = 'Guardar Estudio';
                }
            } else {
                showMessage(data.error || 'No se pudo guardar el estudio.', 'error');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Estudio' : 'Guardar Estudio';
            }
        });
    }

    /**
     * MÓDULO: Formulario de Parte Médico (parte_medico.html)
     */
    async function initParteMedicoPage() {
        const form = $('parteMedicoForm');
        if (!form) return;

        const patientNameEl = $('patientNameForParte');
        const params = new URL(window.location.href).searchParams;
        let patientIdParam = params.get('pid');
        const editHistoryId = params.get('edit_hid');

        if (editHistoryId && !patientIdParam) {
            const data = await getAPI(`${API_HISTORIAL}?action=find_patient&hid=${editHistoryId}`);
            if(data.success) patientIdParam = data.patientId;
        }

        if (!patientIdParam) {
            form.innerHTML = '<p class="message error">No se especificó un ID de paciente.</p>';
            return;
        }

        const pData = await getAPI(`${API_PACIENTES}?action=get_one&id=${patientIdParam}`);
        if (!pData.success) {
            showMessage(pData.error || 'No se pudo cargar el paciente.', 'error');
            return;
        }
        const patient = pData.patient; // Nombres en español
        patientNameEl.textContent = patient.nombre_completo;

        if (editHistoryId) {
            document.title = "Editar Parte Médico";
            form.querySelector('button[type="submit"]').textContent = 'Actualizar Parte Médico';
            
            const data = await getAPI(`${API_HISTORIAL}?action=get_history&id=${patientIdParam}`);
            if (data.success) {
                const historyItem = data.history.find(h => h.id == editHistoryId);
                if (historyItem && historyItem.type === 'Parte Médico') {
                    const d = historyItem.data;
                    $('fechaConsulta').value = d.fechaConsulta || '';
                    $('motivoConsulta').value = d.motivoConsulta || '';
                    $('antecedentesResumen').value = d.antecedentesResumen || '';
                    $('exploracionFisica').value = d.exploracionFisica || '';
                    $('pruebasComplementarias').value = d.pruebasComplementarias || '';
                    $('diagnostico').value = d.diagnostico || '';
                    $('tratamiento').value = d.tratamiento || '';
                }
            } else {
                 showMessage(data.error || 'No se pudo cargar el parte médico.', 'error');
            }
        } else {
            $('fechaConsulta').value = nowISO();
            $('motivoConsulta').value = patient.motivo_consulta || '';
            
            let antecedentes = '';
            if (patient.alergias && patient.alergias.length > 0 && !patient.alergias.includes('Ninguna')) {
                antecedentes += `ALERGIAS: ${patient.alergias.join(', ')}\n\n`;
            }
            if (patient.enfermedades_cronicas && patient.enfermedades_cronicas.length > 0 && !patient.enfermedades_cronicas.includes('Ninguna')) {
                antecedentes += `ENFERMEDADES CRÓNICAS: ${patient.enfermedades_cronicas.join(', ')}\n\n`;
            }
            if (patient.medicamentos_actuales && patient.medicamentos_actuales.length > 0 && !patient.medicamentos_actuales.includes('Ninguna')) {
                antecedentes += `MEDICACIÓN ACTUAL: ${patient.medicamentos_actuales.join(', ')}\n\n`;
            }
            if (patient.cirugias_previas && patient.cirugias_previas.length > 0) {
                antecedentes += 'CIRUGÍAS PREVIAS:\n' + patient.cirugias_previas.map(s => `- ${s.procedure || 'N/A'} (${s.date || 'N/A'})`).join('\n') + '\n\n';
            }
            if (patient.antecedentes_familiares) {
                antecedentes += `ANTECEDENTES FAMILIARES: ${patient.antecedentes_familiares}\n`;
            }
            $('antecedentesResumen').value = antecedentes.trim();
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> &nbsp; Guardando...';

            const parteData = {
                fechaConsulta: $('fechaConsulta').value,
                motivoConsulta: $('motivoConsulta').value,
                antecedentesResumen: $('antecedentesResumen').value,
                exploracionFisica: $('exploracionFisica').value,
                pruebasComplementarias: $('pruebasComplementarias').value,
                diagnostico: $('diagnostico').value,
                tratamiento: $('tratamiento').value,
                createdAt: nowISO()
            };

            const data = await postAPI(API_HISTORIAL, {
                action: 'save_item',
                patientId: patientIdParam,
                historyId: editHistoryId || null,
                type: 'Parte Médico',
                data: parteData
            });

            if (data.success) {
                showMessage(data.message, 'success');
                generateParteMedicoPrintWindow(patient, parteData);
                
                if (editHistoryId) {
                    setTimeout(() => window.location.href = `paciente_full.html?pid=${patientIdParam}`, 1000);
                } else {
                    $('exploracionFisica').value = '';
                    $('pruebasComplementarias').value = '';
                    $('diagnostico').value = '';
                    $('tratamiento').value = '';
                    btn.disabled = false;
                    btn.innerHTML = 'Guardar e Imprimir Parte Médico';
                }
            } else {
                showMessage(data.error || 'No se pudo guardar el parte médico.', 'error');
                btn.disabled = false;
                btn.innerHTML = editHistoryId ? 'Actualizar Parte Médico' : 'Guardar e Imprimir Parte Médico';
            }
        });
    }

        // --- FIN DEL BLOQUE 8 ---

 /**
     * MÓDULO: Formulario de Reportes (reporte.html)
     * (¡AHORA CON REPORTE DE PAGOS!)
     */
    async function initReportPage() {
        const btnReportePagos = $('btnReportePagos');
        const btnReporteCitas = $('btnReporteCitas');
        const btnReporteRecetas = $('btnReporteRecetas');
        const resultContainer = $('reportResultContainer');
        
        if (!btnReportePagos) return; // Salir si no estamos en reporte.html

        // 1. Cargar datos para el REPORTE DE CITAS
        const [patients, agendaData] = await Promise.all([
            loadAllPatients(),
            getAPI(`${API_AGENDA}?action=get_all`),
        ]);
        
        const allAppointments = agendaData.citas;
        
        // --- Helpers de fecha (de tu app.js original) ---
        function getStartDateOfISOWeek(year, week) {
            let d = new Date(Date.UTC(year, 0, 4));
            d.setUTCDate(d.getUTCDate() - (d.getUTCDay() || 7) + 1);
            d.setUTCDate(d.getUTCDate() + (week - 1) * 7);
            return d;
        }
        function getEndDateOfISOWeek(startDate) {
            let d = new Date(startDate);
            d.setUTCDate(d.getUTCDate() + 6);
            return d;
        }
        function formatReportKey(key, title) {
            try {
                if (title.includes('Mes')) {
                    const date = new Date(key.replace(/-/g, '/') + '/02');
                    const monthName = date.toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' });
                    const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                    return `${formattedMonth} ${date.getFullYear()}`;
                }
                if (title.includes('Semana')) {
                    const [year, weekNum] = key.split('-S');
                    const startDate = getStartDateOfISOWeek(parseInt(year), parseInt(weekNum));
                    const endDate = getEndDateOfISOWeek(startDate);
                    const options = { month: 'short', day: 'numeric', timeZone: 'UTC' };
                    const startStr = startDate.toLocaleDateString('es-ES', options);
                    const endStr = endDate.toLocaleDateString('es-ES', options);
                    return `Semana ${weekNum} (${startStr} - ${endStr}, ${year})`;
                }
                if (title.includes('Día')) {
                    const date = new Date(key.replace(/-/g, '/'));
                    return date.toLocaleDateString('es-ES', {
                        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
                    });
                }
            } catch (e) { return key; }
            return key;
        }
        // --- Fin Helpers de fecha ---

        // Función auxiliar para mostrar el reporte en la página
        function displayReport(title, contentHtml) {
            resultContainer.innerHTML = `
                <button type="button" id="btnPrintCurrentReport" class="btn primary" style="float: right;">Imprimir</button>
                <div id="reportContentToPrint">
                    ${contentHtml}
                </div>
            `;
            $('btnPrintCurrentReport').addEventListener('click', () => {
                const reportContent = $('reportContentToPrint').innerHTML;
                const printHeader = getPrintHeader();
                const printFooter = getPrintFooter();
                openPrintPreview(title, printHeader + reportContent + printFooter);
            });
        }

        // --- Reporte de Citas (Sigue funcionando) ---
        btnReporteCitas.addEventListener('click', () => {
            // ... (Toda la lógica de 'btnReporteCitas' que ya tenías) ...
            // ... (La pego aquí para que sea completo) ...
            const periodo = $('reporteCitasPeriodo').value;
            const now = new Date();
            let limitDate = new Date(0); 
            if (periodo === 'mensual') {
                limitDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            } else if (periodo === 'semanal') {
                limitDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            }
            const appointments = allAppointments.filter(a => new Date(a.fecha) >= limitDate);
            const apptsByDay = {}; 
            const countsByWeek = {};
            const countsByMonth = {};
            const getWeekKey = (d) => {
                d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
                var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
                var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
                return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, '0')}`;
            };
            for (const appt of appointments) {
                const d = new Date(appt.fecha.replace(/-/g, '/'));
                const dayKey = appt.fecha;
                const weekKey = getWeekKey(d);
                const monthKey = appt.fecha.substring(0, 7);
                const patient = allPatients.find(p => p.id == appt.id_paciente);
                const patientName = patient ? patient.nombre_completo : 'Paciente Desconocido';
                if (!apptsByDay[dayKey]) apptsByDay[dayKey] = [];
                apptsByDay[dayKey].push({ time: appt.hora.slice(0, 5), name: patientName });
                countsByWeek[weekKey] = (countsByWeek[weekKey] || 0) + 1;
                countsByMonth[monthKey] = (countsByMonth[monthKey] || 0) + 1;
            }
            let html = `<h4>Reporte de Citas (${periodo})</h4><p><strong>Total de Citas en el Periodo: ${appointments.length}</strong></p>`;
            const createList = (title, data) => {
                let listHtml = `<h5>${title}</h5>`;
                const sortedKeys = Object.keys(data).sort().reverse();
                if (sortedKeys.length === 0) return '';
                listHtml += '<ul>';
                for (const key of sortedKeys) {
                    const formattedKey = formatReportKey(key, title);
                    if (title.includes('Día')) {
                        const apptList = data[key].sort((a, b) => a.time.localeCompare(b.time));
                        const count = apptList.length;
                        listHtml += `<li><strong>${formattedKey}:</strong> ${count} cita(s)</li>`;
                        listHtml += '<ul style="font-size: 0.9em; margin-left: 20px; list-style-type: disc; margin-top: 5px; margin-bottom: 10px;">';
                        for (const appt of apptList) { listHtml += `<li>${appt.time} - ${appt.name}</li>`; }
                        listHtml += '</ul>';
                    } else {
                        const count = data[key];
                        listHtml += `<li><strong>${formattedKey}:</strong> ${count} citas</li>`;
                    }
                }
                listHtml += '</ul>';
                return listHtml;
            };
            if (periodo === 'semanal') { html += createList('Desglose por Día', apptsByDay); }
            else if (periodo === 'mensual') { html += createList('Desglose por Semana', countsByWeek); html += createList('Desglose por Día', apptsByDay); }
            else if (periodo === 'general') { html += createList('Desglose por Mes', countsByMonth); html += createList('Desglose por Semana', countsByWeek); }
            displayReport(`Reporte de Citas (${periodo})`, html);
        });


        // --- ¡NUEVA LÓGICA PARA REPORTE DE PAGOS! ---
        // 1. Ya no deshabilitamos el botón
        // btnReportePagos.disabled = true; <-- Línea eliminada
        // $('btnReportePagos')...         <-- Línea eliminada
        
        // 2. Añadimos el Event Listener
        btnReportePagos.addEventListener('click', async () => {
            resultContainer.innerHTML = '<p style="text-align: center; color: var(--muted);">Generando reporte de pagos...</p>';
            
            // Llamamos a la nueva API
            const data = await getAPI(`${API_REPORTES}?action=get_payments`);

            if (!data.success) {
                resultContainer.innerHTML = `<p class="message error">${data.error || 'No se pudo cargar el reporte.'}</p>`;
                return;
            }

            // 3. Generamos el HTML del reporte
            const reportHtml = generatePaymentsReportHtml(data.payments);
            displayReport('Reporte de Pagos y Facturación', reportHtml);
        });

// 4. Función auxiliar para crear la tabla de pagos (¡AHORA SÍ, SIN BASURA Y MÁS JUNTO!)
        function generatePaymentsReportHtml(payments) {
            if (!payments || payments.length === 0) {
                return '<h4>Reporte de Pagos y Facturación</h4><p>No se encontraron pagos registrados.</p>';
            }

            let totalCobrado = 0;
            let totalFacturado = 0;

            const rows = payments.map(p => {
                const monto = parseFloat(p.monto) || 0;
                totalCobrado += monto;
                if (p.facturado) {
                    totalFacturado += monto;
                }
                
                const fecha = new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                let estadoFactura = '';
                if (p.metodo === 'Efectivo') {
                    estadoFactura = '<em>(N/A)</em>';
                } else if (p.facturado && p.facturaEmitida) {
                    estadoFactura = '<span style="color: var(--success-dark);">Emitida</span>';
                } else if (p.facturado) {
                    estadoFactura = '<span style="color: var(--warning-dark);">Pendiente de emitir</span>';
                } else {
                    estadoFactura = 'No solicitada';
                }

                return `
                    <tr>
                        <td>${fecha}</td>
                        <td>${p.paciente || 'N/A'}</td>
                        <td>${p.concepto || 'N/A'}</td>
                        <td>${p.metodo || 'N/A'}</td>
                        <td style="text-align: right;">$${monto.toFixed(2)}</td>
                        <td>${estadoFactura}</td>
                    </tr>
                `;
            }).join('');

            // --- 2. SE GENERA EL HTML COMPLETO ---
            return `
                                <h4 style="margin-bottom: 10px;">Reporte de Pagos y Facturación</h4>
                
                                <table class="report-table" style="margin-top: 0; margin-bottom: 15px;">
                    <thead>
                      <tr>
                          <th>Fecha</th>
                          <th>Paciente</th>
                          <th>Concepto</th>
                          <th>Método</th>
                          <th style="text-align: right;">Monto</th>
                          <th>Facturación</th>
                      </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>

                                <table style="width: 100%; max-width: 400px; margin-top: 0; border: none; border-collapse: collapse;">
                    <tr style="vertical-align: top;">
                        
                                                <td style="width: 50%; padding-right: 8px; border: none;">
                            <div style="padding: 12px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; height: fit-content;">
                                <div style="font-size: 0.85rem; color: #555;">Total Cobrado</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: var(--success-dark);">$${totalCobrado.toFixed(2)}</div>
                            </div>
                        </td>
                        
                                                <td style="width: 50%; padding-left: 8px; border: none;">
                            <div style="padding: 12px; background: #fff; border: 1px solid var(--border, #e2e8f0); border-radius: 8px; height: fit-content;">
                                <div style="font-size: 0.85rem; color: #555;">Total Facturado</div>
                                <div style="font-size: 1.3rem; font-weight: bold;">$${totalFacturado.toFixed(2)}</div>
                            </div>
                        </td>
                    
                    </tr>
                </table>
            `;
        }

        // --- Reporte de Recetas (Sigue deshabilitado por ahora) ---
        btnReporteRecetas.disabled = true;
        $('btnReporteRecetas').closest('fieldset').innerHTML += '<p style="color: var(--danger-dark); font-size: 0.9rem;">(Reporte de recetas generales pendiente de implementación)</p>';
    }

    /**
     * MÓDULO: Formulario de Configuración (config.html)
     * (Tomado de tu app.js original, sin cambios)
     */
    function initConfigPage() {
        const uploadInput = $('signatureUpload');
        const saveBtn = $('saveSignatureBtn');
        const deleteBtn = $('deleteSignatureBtn');
        const preview = $('signaturePreview');
        const previewContainer = $('signaturePreviewContainer');
        
        if (!uploadInput) return; // Salir si no estamos en config.html
        
        let currentSignature = localStorage.getItem(SIGNATURE_KEY);
        if (currentSignature) {
            preview.src = currentSignature;
            previewContainer.style.display = 'block';
        }
        
        uploadInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;

            // Límite de 1MB
            if (file.size > 1024 * 1024) {
                showMessage('La imagen es muy grande. El límite es 1MB.', 'warning');
                uploadInput.value = '';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                preview.src = event.target.result;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        });

        saveBtn.addEventListener('click', () => {
            if (preview.src && !preview.src.endsWith(window.location.pathname)) {
                localStorage.setItem(SIGNATURE_KEY, preview.src);
                showMessage('Firma guardada con éxito.', 'success');
            } else {
                showMessage('No hay ninguna firma nueva para guardar.', 'warning');
            }
        });

        deleteBtn.addEventListener('click', () => {
            localStorage.removeItem(SIGNATURE_KEY);
            preview.src = '';
            previewContainer.style.display = 'none';
            uploadInput.value = '';
            showMessage('Firma eliminada.', 'info');
        });
    }

        // --- FIN DEL BLOQUE 9 ---

        // ---------- 13. FUNCIONES DE IMPRESIÓN (Actualizadas para BD en Español) ----------
    
    /**
     * Genera el HTML del encabezado para todos los documentos impresos.
     */
    function getPrintHeader() {
        const now = new Date();
        const logoUrl = 'Logo.jfif'; // Asume que Logo.jfif está en la carpeta raíz
        return `
            <div class="print-header">
              <div class="logo-col"><img src="${logoUrl}" alt="Logo" class="logo-img"></div>
              <div class="doctor-info">
                <h2>DR. JUAN GÓMEZ OJEDA</h2>
                <p>ORTOPEDIA Y TRAUMATOLOGÍA</p>
                <p>UNIVERSIDAD VERACRUZANA</p>
                <p>CED. PROF. 4446148</p>
                <p>CED. PROF. DE ESPECIALISTA 7463718</p>
              </div>
              <div class="contact-info">
                <p>LAGO CUITZEO No. 142</p>
                <p>COL. DESARROLLO SAN PABLO</p>
                <p>SANTIAGO DE QUERÉTARO</p>
                <p>CEL. 4424237394</p>
                <p style="margin-top: 10px;">Fecha: ${now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>
            </div>`;
    }

    /**
     * Genera el HTML del pie de página (con la firma) para todos los documentos.
     */
    function getPrintFooter() {
        // La firma se sigue guardando en localStorage (específico del navegador)
        const signatureImage = localStorage.getItem(SIGNATURE_KEY); // Usa la constante global
        const signatureContent = signatureImage 
            ? `<img src="${signatureImage}" alt="Firma Digital" class="signature-img">`
            : `<div class="signature-line"></div>`;
        return `
            <div class="print-footer">
                ${signatureContent}
                <p>DR. JUAN GÓMEZ OJEDA</p>
            </div>`;
    }

    /**
     * Abre una nueva ventana del navegador con la vista previa de impresión.
     */
    function openPrintPreview(title, content) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
              <head><title>${title}</title>
                <style>
                  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
                  body { font-family: 'Roboto', sans-serif; color: #333; margin: 0; background-color: #F1F5F9; }
                  .controls { padding: 10px 20px; background-color: #334155; text-align: right; }
                  .controls button { background-color: #10B981; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; }
                  .page-container { width: 21cm; min-height: 29.7cm; padding: 2cm; margin: 1cm auto; background: white; box-shadow: 0 0 0.5cm rgba(0,0,0,0.5); }
                  .print-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #0d9488; padding-bottom: 15px; }
                  .print-header h2 { margin: 0; color: #0f766e; font-size: 24px; }
                  .print-header p { margin: 2px 0; font-size: 14px; color: #555; }
                  .doctor-info { text-align: center; flex-grow: 1; padding: 0 1rem; }
                  .contact-info { text-align: right; font-size: 13px; min-width: 180px; }
                  .contact-info p { margin: 3px 0; }
                  .logo-col { min-width: 80px; text-align: center; }
                  .logo-img { max-width: 70px; max-height: 70px; object-fit: contain; }
                  .patient-data { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 25px 0; display: flex; justify-content: space-between; }
                  h3.section-title { color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-top: 30px; font-size: 20px; }
                  h4 { font-size: 16px; margin-top: 20px; margin-bottom: 8px; color: #334155; }
                  .med-item { margin-bottom: 20px; padding-left: 10px; border-left: 3px solid #64748b; }
                  .med-item h4 { margin: 0 0 5px 0; font-size: 18px; }
                  .med-item p { margin: 4px 0; font-style: italic; color: #475569; }
                  .study-images { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem;}
                  .study-images img { max-width: 45%; border-radius: 4px; border: 1px solid #ccc; }
                  .print-footer { margin-top: 80px; text-align: center; color: #555; page-break-before: auto; }
                  .signature-img { max-height: 80px; }
                  .signature-line { border-bottom: 1px solid #333; width: 250px; margin: 40px auto 5px auto; }
                  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; }
                  p { line-height: 1.6; }
                  ul { margin: 5px 0; padding-left: 20px; }
                  li { margin-bottom: 10px; }
                  @media print {
                    .controls { display: none; }
                    body { background-color: white; }
                    .page-container { margin: 0; box-shadow: none; width: auto; min-height: auto; padding: 1cm; }
                  }
                </style>
              </head>
              <body>
                <div class="controls"><button onclick="window.print()">Imprimir</button></div>
                <div class="page-container">${content}</div>
              </body>
            </html>
        `);
        printWindow.document.close();
    }
    
    /**
     * Función de reimpresión (llamada desde paciente_full.html)
     * @param {object} patient - El objeto PACIENTE COMPLETO (con claves en español)
     * @param {object} historyItem - El objeto de HISTORIAL (con claves genéricas type, data)
     */
    function reprintItem(patient, historyItem) {
        const { type, data } = historyItem;
        // 'patient' ya tiene los nombres en español (ej. nombre_completo)
        // 'data' tiene los datos del historial (ej. data.medications)
        switch (type) {
            case 'Receta emitida':
                generatePrintWindow(patient, data.medications, data.recommendations);
                break;
            case 'Diagnóstico':
                generateDiagnosisPrintWindow(patient, data);
                break;
            case 'Estudio Médico':
                generateStudyPrintWindow(patient, data);
                break;
            case 'Registro de Pago':
                generatePaymentPrintWindow(patient, data);
                break;
            case 'Parte Médico':
                generateParteMedicoPrintWindow(patient, data);
                break;
            default:
                showMessage('Este elemento no se puede imprimir.', 'info');
        }
    }
    
    // 1. Impresión de Receta
    function generatePrintWindow(patient, medications, recommendations) {
        const header = getPrintHeader();
        const footer = getPrintFooter();
        const esc = (s = '') => String(s || '').replace(/\n/g, '<br>');
        const patientName = patient.nombre_completo || '';
        const patientAge = patient.edad || calculateAge(patient.fecha_nacimiento);
        const today = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });

        const medsListHtml = (medications || []).map(med => {
            const name = esc(med.name);
            const dose = esc(med.dose);
            const form = esc(med.form);
            const freq = esc(med.freq);
            const dur = esc(med.dur);
            const instr = esc(med.instr);
            return `
            <div class="med-item">
                <h4>${name} ${dose} ${form ? `(${form})` : ''}</h4>
                <p><strong>Indicación:</strong> ${freq} por ${dur}.</p>
                ${instr ? `<p><strong>Adicional:</strong> ${instr}</p>` : ''}
            </div>`;
        }).join('');

        const recommendationsHtml = recommendations 
            ? `<h3 class="section-title">Recomendaciones Generales</h3><p>${esc(recommendations)}</p>` 
            : '';

        const mainContent = `
            <div class="patient-data" style="display: flex; justify-content: space-between; align-items: center;">
                <span><strong>Paciente:</strong> ${esc(patientName)}</span>
                <span><strong>Edad:</strong> ${esc(patientAge) || 'N/A'}</span>
                <span><strong>Fecha:</strong> ${today}</span>
            </div>
            <div>
                <h3 class="section-title">Tratamiento (Receta Médica)</h3>
                ${medsListHtml}
            </div>
            <div>
                ${recommendationsHtml}
            </div>
        `;
        const fullContent = header + mainContent + footer;
        openPrintPreview(`Receta Médica - ${patientName}`, fullContent);
    }
    
    // 2. Impresión de Historial Completo
    function generateHistoryPrintWindow(patient, history) {
        const header = getPrintHeader();
        const footer = getPrintFooter();
        const esc = (s='') => String(s||'');
        const patientName = patient.nombre_completo || '';
        const patientAge = patient.edad || calculateAge(patient.fecha_nacimiento);

        let surgeriesHtml = 'No reportadas';
        if (Array.isArray(patient.cirugias_previas) && patient.cirugias_previas.length > 0) {
            surgeriesHtml = '<ul>' + patient.cirugias_previas.map(s => 
                `<li><strong>${s.date || 'N/A'}:</strong> ${s.procedure || 'N/A'}. <em>${s.complication ? 'Complicaciones: ' + s.complication : ''}</em></li>`
            ).join('') + '</ul>';
        }
        
        const formatHistoryDataForPrint = (h) => {
            const { type, data } = h;
            if (!data) return '';
            let content = '';
            switch (type) {
                case 'Receta emitida':
                    if (data.medications && Array.isArray(data.medications)) {
                        content = data.medications.map(med => `${med.name} ${med.dose || ''}`).join(', ');
                    }
                    break;
                case 'Cita agendada': content = `Fecha: ${data.fecha}, Hora: ${data.hora}`; break;
                case 'Cita eliminada': content = `Cancelada (Fecha: ${data.fecha}, Hora: ${data.hora})`; break;
                case 'Cita finalizada': content = `Consulta (Fecha: ${data.fecha}, Hora: ${data.hora})`; break;
                case 'Parte Médico': content = `Diagnóstico: ${data.diagnostico || data.analysis}`; break;
                case 'Diagnóstico': content = data.title; break;
                case 'Estudio Médico': content = `${data.type} de ${data.bodyPart}`; break;
                case 'Registro de Pago': content = `Monto: $${data.amount} (${data.method})`; break;
                default: return '';
            }
            return `<span>${content}</span>`;
        };

        const historyHtml = history.length 
            ? '<ul>' + history.map(h => {
                let titleText = h.type;
                if (h.type === 'Diagnóstico') titleText = h.data.title;
                else if (h.type === 'Estudio Médico') titleText = h.data.type;
                const date = new Date(h.timestamp); // timestamp ya está en formato JS
                return `<li style="margin-bottom: 10px;"><strong>${esc(titleText)}</strong> <span style="font-size: 0.8em; color: #555;">(${date.toLocaleString('es-ES')})</span><br/>${formatHistoryDataForPrint(h)}</li>`
            }).join('') + '</ul>'
            : '<p>No hay historial de actividad.</p>';

        const mainContent = `
            <div class="patient-data"><span><strong>Paciente:</strong> ${patientName}</span></div>
            <div><h3 class="section-title">Datos Personales</h3><div class="grid">
                <div><strong>Edad:</strong> ${esc(patientAge || '—')}</div>
                <div><strong>Sexo:</strong> ${esc(patient.sexo || '—')}</div>
                <div><strong>Teléfono:</strong> ${esc(patient.telefono || '—')}</div>
                <div><strong>RFC:</strong> ${esc(patient.rfc || '—')}</div>
            </div></div>
            <div><h3 class="section-title">Antecedentes Médicos</h3>
                <p><strong>Alergias:</strong> ${(patient.alergias && patient.alergias.length) ? esc(patient.alergias.join(', ')) : '—'}</p>
                <p><strong>Enfermedades Crónicas:</strong> ${(patient.enfermedades_cronicas && patient.enfermedades_cronicas.length) ? esc(patient.enfermedades_cronicas.join(', ')) : '—'}</p>
                <div><strong>Cirugías Previas:</strong> ${surgeriesHtml}</div>
            </div>
            <div><h3 class="section-title">Historial de Actividad</h3>${historyHtml}</div>
        `;
        const fullContent = header + mainContent + footer;
        openPrintPreview(`Historial Médico - ${patientName}`, fullContent);
    }

    // 3. Impresión de Diagnóstico
    function generateDiagnosisPrintWindow(patient, diagnosisData) {
        const header = getPrintHeader();
        const footer = getPrintFooter();
        const patientName = patient.nombre_completo || '';
        const esc = (s = '') => String(s || '').replace(/\n/g, '<br>');
        const mainContent = `
            <div class="patient-data"><span><strong>Paciente:</strong> ${patientName}</span></div>
            <div><h3 class="section-title">Diagnóstico Médico</h3>
                <h4>${esc(diagnosisData.title)}</h4>
                <p>${esc(diagnosisData.description)}</p>
            </div>
        `;
        const fullContent = header + mainContent + footer;
        openPrintPreview(`Diagnóstico - ${patientName}`, fullContent);
    }

    // 4. Impresión de Estudio
    function generateStudyPrintWindow(patient, studyData) {
        const header = getPrintHeader();
        const footer = getPrintFooter();
        const patientName = patient.nombre_completo || '';
        const esc = (s = '') => String(s || '').replace(/\n/g, '<br>');
        const imagesHtml = (studyData.images || []).map(imgData => `<img src="${imgData}" style="max-width: 100%; margin-bottom: 1rem; border-radius: 4px;" />`).join('');

        const mainContent = `
            <div class="patient-data"><span><strong>Paciente:</strong> ${patientName}</span></div>
            <div><h3 class="section-title">Estudio Médico</h3>
                <p><strong>Tipo de Estudio:</strong> ${esc(studyData.type)}</p>
                <p><strong>Parte del Cuerpo:</strong> ${esc(studyData.bodyPart)}</p>
                <p><strong>Fecha del Estudio:</strong> ${esc(studyData.date)}</p>
                <h4>Hallazgos</h4>
                <p>${esc(studyData.findings)}</p>
                ${imagesHtml ? `<h3 class="section-title">Imágenes Adjuntas</h3><div class="study-images">${imagesHtml}</div>` : ''}
            </div>
        `;
        const fullContent = header + mainContent + footer;
        openPrintPreview(`Estudio - ${patientName}`, fullContent);
    }
    
    // 5. Impresión de Parte Médico
    function generateParteMedicoPrintWindow(patient, parteData) {
        const header = getPrintHeader();
        const footer = getPrintFooter();
        const patientName = patient.nombre_completo || '';
        const esc = (s = '') => String(s || 'N/A').replace(/\n/g, '<br>');
        
        const mainContent = `
            <div class="patient-data">
                <span><strong>Paciente:</strong> ${patientName}</span>
                <span><strong>Fecha Consulta:</strong> ${esc(parteData.fechaConsulta)}</span>
            </div>
            <div><h3 class="section-title">Parte Médico</h3>
                <h4>Motivo de la Consulta</h4><p>${esc(parteData.motivoConsulta)}</p>
                <h4>Resumen de Historia Clínica (Antecedentes)</h4><p>${esc(parteData.antecedentesResumen)}</p>
                <h4>Exploración Física</h4><p>${esc(parteData.exploracionFisica)}</p>
                <h4>Pruebas Complementarias</h4><p>${esc(parteData.pruebasComplementarias)}</p>
                <h4>Diagnóstico</h4><p>${esc(parteData.diagnostico)}</p>
                <h4>Tratamiento y Plan</h4><p>${esc(parteData.tratamiento)}</p>
            </div>
        `;
        const fullContent = header + mainContent + footer;
        openPrintPreview(`Parte Médico - ${patientName}`, fullContent);
    }
    
    // 6. Impresión de Pago
    function generatePaymentPrintWindow(patient, paymentData) {
        const header = getPrintHeader();
        const footer = getPrintFooter();
        const patientName = patient.nombre_completo || '';
        const esc = (s = '') => String(s || '');
        const mainContent = `
            <div class="patient-data"><span><strong>Paciente:</strong> ${patientName}</span></div>
            <div><h3 class="section-title">Recibo de Pago</h3>
                <p><strong>Concepto:</strong> ${esc(paymentData.concept)}</p>
                <p><strong>Monto Pagado:</strong> $${Number(paymentData.amount).toFixed(2)} MXN</p>
                <p><strong>Método de Pago:</strong> ${esc(paymentData.method)}</p>
                <p><strong>Fecha de Pago:</strong> ${new Date(paymentData.createdAt || Date.now()).toLocaleDateString('es-ES', { dateStyle: 'full' })}</p>
            </div>
        `;
        const fullContent = header + mainContent + footer;
        openPrintPreview(`Recibo de Pago - ${patientName}`, fullContent);
    }
    
    
    // ---------- 14. INICIALIZADOR PRINCIPAL (EL QUE ARRANCA TODO) ----------
    
    document.addEventListener('DOMContentLoaded', () => {
        
        // Determinamos en qué página estamos
        const page = window.location.pathname.split('/').pop();

        if (page === 'login.html') {
            initLogin();
            return; // No ejecutamos nada más en la página de login
        }
        
        // Si es la página de inicio (index.html) o una desconocida, no hacemos nada de admin
        if (page === 'index.html' || page === 'inicio.html' || page === '') {
            // (La página de inicio pública no necesita JS especial de admin)
            // Solo revisamos la sesión para ver si mostramos el botón "Salir"
            (async () => {
                const data = await postAPI(API_LOGIN, { action: 'check_session' });
                if (data.success && data.role === 'medico') {
                    const logoutButton = $('logoutButton');
                    if (logoutButton) logoutButton.style.display = 'inline-flex';
                    initLogout();
                }
            })();
            return; // No ejecutamos el resto (que es para el panel de admin)
        }

        // --- INICIO: Revisión de Seguridad ---
        // Para todas las demás páginas (.html), revisamos la sesión
        (async () => {
            const data = await postAPI(API_LOGIN, { action: 'check_session' });
            
            if (!data.success || data.role !== 'medico') {
                // Si NO está logueado, o no es 'medico'
                // Guardamos la página actual para redirigir después del login
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                // Lo botamos a la página de login
                window.location.href = 'login.html';
                return; // Detenemos la ejecución
            }

            // --- Si la sesión es VÁLIDA, continuamos cargando la página ---
            
            // 1. Mostramos el botón de "Salir"
            const logoutButton = $('logoutButton');
            if (logoutButton) logoutButton.style.display = 'inline-flex';
            
            // 2. Inicializamos los módulos comunes a todas las páginas de admin
            initLogout(); // (Activa el botón de 'Salir')
            
            // 3. Inicializamos los módulos específicos de CADA página
            switch (page) {
                case 'agenda.html':
                    initCalendarModule();
                    break;
                case 'paciente.html':
                    initPatientForm();
                    break;
                case 'historial.html':
                    initHistoryPage();
                    break;
                case 'paciente_full.html':
                    initPatientDetailPage();
                    break;
                case 'receta.html':
                    initRecetaPage();
                    break;
                case 'pago.html':
                    initPaymentPage();
                    break;
                case 'diagnostico.html':
                    initDiagnosisPage();
                    break;
                case 'estudio.html':
                    initStudyPage();
                    break;
                case 'reporte.html':
                    initReportPage();
                    break;
                case 'parte_medico.html':
                    initParteMedicoPage();
                    break;
                case 'config.html':
                    initConfigPage();
                    break;
            }
        })();

    }); // Fin del DOMContentLoaded

})(); // Fin de la IIFE (Función autoejecutable)