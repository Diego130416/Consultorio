(() => {
  // ---------- Utilidades ----------
  const DB_KEY = 'clinic_db_v1';
  const SIGNATURE_KEY = 'clinic_signature_v1';
  const $ = id => document.getElementById(id);
  const nowISO = () => new Date().toISOString();
  const randId = (pref = 'id') => `${pref}_${Math.random().toString(36).slice(2,9)}`;

  /**
   * Guarda una imagen de firma (en formato Base64) en el almacenamiento local.
   * @param {string | null} base64ImageString La imagen de la firma en formato Base64, o null para eliminarla.
   */
  function saveSignatureImage(base64ImageString) {
      if(base64ImageString) {
        localStorage.setItem(SIGNATURE_KEY, base64ImageString);
      } else {
        localStorage.removeItem(SIGNATURE_KEY);
      }
  }

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        const seed = { patients: [], appointments: [], blockedSlots: [], histories: {} };
        localStorage.setItem(DB_KEY, JSON.stringify(seed));
        return seed;
      }
      const db = JSON.parse(raw);
      db.patients = db.patients || [];
      db.appointments = db.appointments || [];
      db.blockedSlots = db.blockedSlots || [];
      db.histories = db.histories || {};
      return db;
    } catch {
      const seed = { patients: [], appointments: [], blockedSlots: [], histories: {} };
      localStorage.setItem(DB_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

  function showMessage(text, type = 'info', timeout = 3500) {
    const box = $('messageBox');
    if (!box) { alert(text); return; }
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
      okBtn.addEventListener('click', () => close(true));
      cancelBtn.addEventListener('click', () => close(false));
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
        resolve(value);
      };
      const submit = () => close(input.value);
      okBtn.addEventListener('click', submit);
      cancelBtn.addEventListener('click', () => close(null));
      input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    });
  }
 
function updateDashboardStats() {
    const todayCountEl = $('todayCount');
    const blockedCountEl = $('blockedCount');
    const nextApptEl = $('nextAppt');
    if (!todayCountEl || !blockedCountEl || !nextApptEl) return;
    const db = loadDB();
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const todayAppointments = db.appointments.filter(a => a.date === todayISO);
    todayCountEl.textContent = todayAppointments.length;
    const todayBlocked = db.blockedSlots.filter(b => b.date === todayISO);
    blockedCountEl.textContent = todayBlocked.length;
    const now = new Date();
    const upcomingAppointments = db.appointments
        .filter(a => new Date(a.date + 'T' + a.time) >= now)
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
    if (upcomingAppointments.length > 0) {
        const next = upcomingAppointments[0];
        const patient = db.patients.find(p => p.id === next.patientId);
        const nextDate = new Date(next.date + 'T' + next.time);
        let dateString;
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (next.date === todayISO) {
            dateString = 'Hoy';
        } else if (next.date === tomorrow.toISOString().slice(0, 10)) {
            dateString = 'Mañana';
        } else {
            dateString = nextDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' });
        }
        // MODIFICADO: Usa fullName o name para compatibilidad
        nextApptEl.textContent = `${patient ? (patient.fullName || patient.name) : 'Paciente'} - ${dateString} a las ${next.time}`;
    } else {
        nextApptEl.textContent = '—';
    }
}

  // ---------- Horarios ----------
  function workingHours(dow) {
    if (dow >= 1 && dow <= 5) return ['15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
    if (dow === 6) return ['08:00','09:00','10:00','11:00'];
    if (dow === 0) return ['07:00','08:00','09:00','10:00','11:00','12:00'];
    return [];
  }

  // ---------- Datos para listas ----------
  const ALL_ALERGIES = ['Ninguna','Penicilina','Amoxicilina','Cefalosporinas','Macrólidos','Tetraciclinas','Aminoglucósidos','Quinolonas','Sulfonamidas','Anestésicos locales','Anestésicos generales','AINE','Ibuprofeno','Naproxeno','Paracetamol','Látex','Mariscos','Crustáceos','Pescado','Frutos secos','Huevo','Leche','Polen','Ácaros del polvo','Moho','Picaduras de insecto','Perfumes','Metales','Otro'];
  const ALL_CHRONIC = ['Ninguna','Diabetes tipo 1','Diabetes tipo 2','Hipertensión arterial','Dislipidemia','Enfermedad coronaria','Insuficiencia cardíaca','Arritmias','Accidente cerebrovascular','EPOC','Asma','Apnea del sueño','Insuficiencia renal crónica','Enfermedad hepática crónica','Hipotiroidismo','Hipertiroidismo','Osteoporosis','Artritis reumatoide','Enfermedad autoinmune','Cáncer','Epilepsia','Parkinson','Trastorno psiquiátrico','Obesidad','Tromboembolismo venoso','Otro'];
  const ALL_MEDICATIONS = ['Ninguna','Paracetamol','Ibuprofeno','Aspirina','Naproxeno','Metformina','Insulina','Enalapril','Lisinopril','Losartán','Atorvastatina','Simvastatina','Omeprazol','Pantoprazol','Levotiroxina','Prednisona','Metotrexato','Amoxicilina','Cefalexina','Tramadol','Codeína','Diazepam','Alprazolam','Sertralina','Fluoxetina','Warfarina','Rivaroxabán','Salbutamol','Antidepresivos','Antipsicóticos','Otro'];

  // ---------- UI: chips / checkbox groups ----------
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
  function bindNoneBehavior(containerId) {
    const cont = $(containerId);
    if (!cont) return;
    cont.addEventListener('change', () => {
      const noneCb = cont.querySelector('input[value="Ninguna"]');
      const others = Array.from(cont.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.value !== 'Ninguna');
      if (noneCb && noneCb.checked) {
        others.forEach(cb => { 
            cb.checked = false; 
            cb.disabled = true; 
            cb.closest('.checkbox-item')?.classList?.remove('checked'); 
        });
      } else {
        others.forEach(cb => { cb.disabled = false; });
      }
      const anyOtherChecked = others.some(cb => cb.checked);
      if (anyOtherChecked && noneCb && noneCb.checked) { 
        noneCb.checked = false; 
        noneCb.closest('.checkbox-item')?.classList?.remove('checked'); 
      }
    });
  }

// ---------- LÓGICA DE RFC Y EDAD (NUEVA) ----------
  function calculateAge(birthdate) {
    if (!birthdate) return '';
    try {
        const today = new Date();
        const birthDate = new Date(birthdate.replace(/-/g, '/'));
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } catch(e) {
        return '';
    }
  }
  
  function generateRFC(nombre, paterno, materno, birthdate) {
    if (!nombre || !paterno || !birthdate) return '';

    const normalize = (str) => {
        return str.toUpperCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
            .replace(/Ñ/g, 'N')
            .replace(/[^A-Z]/g, ''); // Dejar solo letras
    };

    const stripPrefixes = (str) => {
        // Quitar artículos y prefijos comunes
        return str.replace(/^(DE |LA |LOS |LAS |Y |DEL |MC |MAC |VON |VAN |DI |DAS )/, '');
    };

    const getVowel = (str) => {
        const match = str.substring(1).match(/[AEIOU]/); // Buscar vocal a partir del segundo caracter
        return match ? match[0] : 'X'; // Si no hay vocal, usar X
    };

    const nombres = stripPrefixes(normalize(nombre).split(' ')[0]); // Solo primer nombre
    const p = stripPrefixes(normalize(paterno));
    const m = stripPrefixes(normalize(materno));

    let rfc = '';
    
    if (p.length < 3) { // Regla para apellidos cortos (ej. De la O)
        rfc = (p[0] || 'X') + (m[0] || 'X') + (nombres[0] || 'X') + (nombres[1] || 'X');
    } else {
        rfc = (p[0] || 'X') + getVowel(p) + (m[0] || 'X') + (nombres[0] || 'X');
    }
    
    // Lista de palabras inconvenientes
    const badWords = ['BUEI','BUEY','CACA','CACO','CAGA','CAGO','CAKA','COGE','COJA','COJO','CULO','FETO','JOTO','KACA','KACO','KAGA','KAGO','KOGE','KOJO','KULO','MAMO','MEAR','MEAS','MEON','MION','MULA','PEDO','PEDA','PENE','PUTA','PUTO','QULO','RATA','RUIN'];
    if (badWords.includes(rfc)) {
        rfc = rfc.slice(0, 3) + 'X'; // Cambiar la última letra por X
    }

    // Formatear fecha
    try {
        const date = new Date(birthdate.replace(/-/g, '/')); // Corregir formato de fecha para Safari/iOS
        const yy = date.getFullYear().toString().slice(-2);
        const mm = (date.getMonth() + 1).toString().padStart(2, '0');
        const dd = date.getDate().toString().padStart(2, '0');
        return rfc + yy + mm + dd;
    } catch(e) {
        return rfc; // Devuelve solo la parte de letras si la fecha es inválida
    }
  }

// ---------- MÓDULO: FORMULARIO DE PACIENTE (MODIFICADO) ----------
  function initPatientForm() {
    const form = $('patientForm');
    if (!form) return;
    renderCheckboxGroup('allergiesGroup', ALL_ALERGIES);
    renderCheckboxGroup('chronicGroup', ALL_CHRONIC);
    renderCheckboxGroup('medsGroup', ALL_MEDICATIONS);
    bindNoneBehavior('allergiesGroup');
    bindNoneBehavior('chronicGroup');
    bindNoneBehavior('medsGroup');

    // --- AÑADIDO: Lógica para autogenerar RFC y Edad ---
    const rfcInput = $('rfc');
    const nombreInput = $('nombre');
    const paternoInput = $('paterno');
    const maternoInput = $('materno');
    const birthdateInput = $('birthdate');
    const ageInput = $('age');
    
    if (ageInput) ageInput.disabled = true; // Deshabilitar campo de edad

    const updateDynamicFields = () => {
        const nombre = nombreInput.value;
        const paterno = paternoInput.value;
        const materno = maternoInput.value;
        const birthdate = birthdateInput.value;
        
        // Generar y mostrar RFC
        const rfc = generateRFC(nombre, paterno, materno, birthdate);
        rfcInput.value = rfc;
        
        // Calcular y mostrar Edad
        const age = calculateAge(birthdate);
        ageInput.value = age;
    };

    [nombreInput, paternoInput, maternoInput, birthdateInput].forEach(el => {
        el?.addEventListener('input', updateDynamicFields);
    });
    // --- Fin de lógica RFC y Edad ---

    const bindOtherFieldVisibility = (groupId, containerId) => {
        const group = $(groupId);
        if (!group) return;
        group.addEventListener('change', () => {
            const otroCheckbox = group.querySelector('input[value="Otro"]');
            const container = $(containerId);
            if (otroCheckbox && container) {
                container.style.display = otroCheckbox.checked ? 'block' : 'none';
            }
        });
    };

    bindOtherFieldVisibility('allergiesGroup', 'allergiesOtherContainer');
    bindOtherFieldVisibility('chronicGroup', 'chronicOtherContainer');
    bindOtherFieldVisibility('medsGroup', 'medsOtherContainer');

    const surgeriesToggle = $('surgeriesToggle');
    const surgeriesContainer = $('surgeriesContainer');
    const addSurgeryBtn = $('addSurgeryBtn');

    if (surgeriesToggle) {
        const addSurgeryBlock = (data = {}) => {
            const surgeryId = randId('surg');
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

        surgeriesToggle.addEventListener('change', () => {
            if (surgeriesToggle.value === 'Si') {
                surgeriesContainer.style.display = 'block';
                if (surgeriesContainer.querySelectorAll('.surgery-group').length === 0) {
                    addSurgeryBlock();
                }
            } else {
                surgeriesContainer.style.display = 'none';
            }
        });

        addSurgeryBtn.addEventListener('click', () => addSurgeryBlock());

        surgeriesContainer.addEventListener('click', e => {
            if (e.target.dataset.surgId) {
                $(e.target.dataset.surgId)?.remove();
            }
        });
    }

    const collectSurgeries = () => {
        if (!surgeriesToggle || surgeriesToggle.value === 'No') {
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
    };

    const substanceSel = $('substance');
    const substanceFields = $('substanceOccasionalFields');
    if (substanceSel && substanceFields) {
      substanceFields.style.display = 'none';
      substanceSel.addEventListener('change', () => {
        substanceFields.style.display = (substanceSel.value === 'Si') ? 'block' : 'none';
      });
    }
    (function tryPopulateEdit() {
      const params = new URL(window.location.href).searchParams;
      const editId = params.get('edit');
      if (!editId) return;
      const db = loadDB();
      const p = db.patients.find(x => x.id === editId);
      if (!p) return;
      
        $('nombre').value = p.nombre || '';
        $('paterno').value = p.paterno || '';
        $('materno').value = p.materno || '';
      if (p.age) $('age').value = p.age;
      if (p.sex) $('sex').value = p.sex;
      if (p.birthdate) $('birthdate').value = p.birthdate;
      if (p.phone) $('phone').value = p.phone;
      if (p.rfc) $('rfc').value = p.rfc;
      if (p.familyHistory) $('familyHistory').value = p.familyHistory;

      // Calcular edad al cargar
      if (p.birthdate) ageInput.value = calculateAge(p.birthdate);

        if (surgeriesToggle && Array.isArray(p.surgeries) && p.surgeries.length > 0) {
            surgeriesToggle.value = 'Si';
            surgeriesContainer.style.display = 'block';
            p.surgeries.forEach(surgery => addSurgeryBlock(surgery));
        } else if (surgeriesToggle) {
            surgeriesToggle.value = 'No';
            surgeriesContainer.style.display = 'none';
        }
        
      if (p.reason) $('reason').value = p.reason;
      if (p.symptoms) $('symptoms').value = p.symptoms;
      function setChecks(containerId, values) {
        const cont = $(containerId);
        if (!cont || !values) return;
        Array.from(cont.querySelectorAll('input[type="checkbox"]')).forEach(cb => {
            cb.checked = values.includes(cb.value);
            cb.closest('.checkbox-item').classList.toggle('checked', cb.checked);
        });
      }
      setChecks('allergiesGroup', p.allergies || []);
      setChecks('chronicGroup', p.chronic || []);
      setChecks('medsGroup', p.medications || []);

        const populateOtherField = (patientValues, allItems, groupId, containerId, inputId) => {
            if (!patientValues) return;
            const customValue = patientValues.find(val => !allItems.includes(val));
            
            if (customValue) {
                const group = $(groupId);
                const container = $(containerId);
                const input = $(inputId);
                const otroCheckbox = group.querySelector('input[value="Otro"]');
                if (otroCheckbox) {
                    otroCheckbox.checked = true;
                    otroCheckbox.closest('.checkbox-item').classList.add('checked');
                }
                if (container) container.style.display = 'block';
                if (input) input.value = customValue;
            }
        };

        populateOtherField(p.allergies, ALL_ALERGIES, 'allergiesGroup', 'allergiesOtherContainer', 'allergiesOther');
        populateOtherField(p.chronic, ALL_CHRONIC, 'chronicGroup', 'chronicOtherContainer', 'chronicOther');
        populateOtherField(p.medications, ALL_MEDICATIONS, 'medsGroup', 'medsOtherContainer', 'medicationsOther');
      
      if (p.substance) {
        $('substance').value = p.substance;
        if ((p.substance === 'Si') && substanceFields) {
          substanceFields.style.display = 'block';
          $('substanceName').value = p.substanceDetail?.name || '';
          $('substanceFreq').value = p.substanceDetail?.frequency || '';
        } else if (substanceFields) substanceFields.style.display = 'none';
      }
      form.addEventListener('submit', function updateHandler(e) {
        e.preventDefault();
        const db2 = loadDB();
        const idx = db2.patients.findIndex(x => x.id === editId);
        if (idx < 0) { showMessage('Paciente no encontrado', 'error'); return; }
        const substance = $('substance').value || null;
        let substanceDetail = null;
        if ((substance === 'Si') && substanceFields) {
          const name = $('substanceName').value.trim(), freq = $('substanceFreq').value.trim();
          substanceDetail = { name: name || null, frequency: freq || null };
        }

        const nombre = $('nombre').value.trim();
        const paterno = $('paterno').value.trim();
        const materno = $('materno').value.trim();
        const birthdate = $('birthdate').value;
        const fullName = [nombre, paterno, materno].filter(Boolean).join(' ');
        const rfc = generateRFC(nombre, paterno, materno, birthdate);
        const age = calculateAge(birthdate);

        const updated = { ...db2.patients[idx], 
            nombre, paterno, materno, fullName, rfc, age,
            sex: $('sex').value || null, 
            birthdate: birthdate || null, 
            phone: $('phone').value.trim() || null, 
            allergies: collectGroup('allergiesGroup','allergiesOther'), 
            chronic: collectGroup('chronicGroup','chronicOther'), 
            surgeries: collectSurgeries(), 
            medications: collectGroup('medsGroup','medicationsOther'), 
            familyHistory: $('familyHistory').value.trim(), 
            reason: $('reason').value.trim(), 
            symptoms: $('symptoms').value.trim(), 
            substance, 
            substanceDetail 
        };
        db2.patients[idx] = updated;
        db2.histories[editId] = db2.histories[editId] || [];
        db2.histories[editId].push({ id: randId('h'), timestamp: nowISO(), type: 'Edición', data: updated });
        saveDB(db2);
        showMessage('Paciente actualizado', 'success');
        window.location.href = `paciente_full.html?pid=${encodeURIComponent(editId)}`;
      }, { once: true });
    })();
    form.addEventListener('submit', function createHandler(e) {
      if (new URL(location.href).searchParams.get('edit')) return;
      e.preventDefault();
      const db = loadDB();
      const substance = $('substance').value || null;
      let substanceDetail = null;
      if ((substance === 'Si') && substanceFields) {
        const name = $('substanceName').value.trim(), freq = $('substanceFreq').value.trim();
        substanceDetail = { name: name || null, frequency: freq || null };
      }
      
      const nombre = $('nombre').value.trim();
      const paterno = $('paterno').value.trim();
      const materno = $('materno').value.trim();
      const birthdate = $('birthdate').value;
      const fullName = [nombre, paterno, materno].filter(Boolean).join(' ');
      const rfc = generateRFC(nombre, paterno, materno, birthdate);
      const age = calculateAge(birthdate);

      if (!nombre || !paterno || !birthdate) {
        showMessage('Nombre, Apellido Paterno y Fecha de Nacimiento son obligatorios.', 'warning');
        return;
      }

      const patient = { 
        id: randId('p'), 
        nombre, paterno, materno, fullName, rfc, age,
        sex: $('sex').value || null, 
        birthdate: birthdate || null, 
        phone: $('phone').value.trim() || null, 
        allergies: collectGroup('allergiesGroup','allergiesOther'), 
        chronic: collectGroup('chronicGroup','chronicOther'), 
        surgeries: collectSurgeries(), 
        medications: collectGroup('medsGroup','medicationsOther'), 
        familyHistory: $('familyHistory').value.trim(), 
        reason: $('reason').value.trim(), 
        symptoms: $('symptoms').value.trim(), 
        substance, 
        substanceDetail, 
        createdAt: nowISO() 
      };
      db.patients.push(patient);
      db.histories[patient.id] = db.histories[patient.id] || [];
      db.histories[patient.id].push({ id: randId('h'), timestamp: nowISO(), type: 'Registro inicial', data: patient });
      saveDB(db);
      showMessage('Paciente creado', 'success');
      form.reset();
      ['allergiesOtherContainer','chronicOtherContainer','medsOtherContainer','substanceOccasionalFields'].forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
      if (surgeriesToggle) {
        surgeriesToggle.value = 'No';
        surgeriesContainer.style.display = 'none';
        surgeriesContainer.querySelectorAll('.surgery-group').forEach(group => group.remove());
      }
    });
    $('resetBtn')?.addEventListener('click', () => {
      form.reset();
      ['allergiesOtherContainer','chronicOtherContainer','medsOtherContainer','substanceOccasionalFields'].forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
      if (surgeriesToggle) {
        surgeriesToggle.value = 'No';
        surgeriesContainer.style.display = 'none';
        surgeriesContainer.querySelectorAll('.surgery-group').forEach(group => group.remove());
      }
    });
  }

// ---------- MÓDULO: AGENDA Y CALENDARIO ----------
  function initCalendarModule() {
    const cal = $('calendar');
    if (!cal) return;

    const container = document.querySelector('.container');
    
    const prev = $('prevMonth'), next = $('nextMonth'), monthLabel = $('monthLabel'), yearLabel = $('yearLabel'), selectedDateLabel = $('selectedDateLabel'), eventsCol = $('eventsColumn');
    
    const quickModal = $('quickModal'), qInput = $('quickModalInput'), qTitle = $('quickModalTitle'), qOk = $('quickModalOk'), qCancel = $('quickModalCancel'), qClose = $('closeQuickModal');
    let pendingBooking = null;

    function openQuickModal(dateISO, hour) {
        pendingBooking = { dateISO, hour };
        
        if(qTitle) {
            const date = new Date(dateISO.replace(/-/g, '/'));
            const formattedDate = date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            qTitle.textContent = `Agendar cita para el ${formattedDate} a las ${hour}`;
        }
        
        if(qInput) qInput.value = '';
        if(quickModal) {
            quickModal.classList.remove('hidden');
            quickModal.setAttribute('aria-hidden', 'false');
        }
        if(qInput) qInput.focus();
    }
    function closeQuickModal() {
        pendingBooking = null;
        if(quickModal) {
            quickModal.classList.add('hidden');
            quickModal.setAttribute('aria-hidden', 'true');
        }
    }
    
    qOk?.addEventListener('click', () => {
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

    qCancel?.addEventListener('click', closeQuickModal);
    qClose?.addEventListener('click', closeQuickModal);
    qInput?.addEventListener('keydown', e => { if (e.key === 'Enter') qOk?.click(); });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let viewDate = new Date();
    viewDate.setHours(0,0,0,0);
    let timeIndicatorInterval = null;

    function updateCurrentTimeIndicator() {
        const dayView = $('dayView');
        if (!dayView) return;
        
        let indicator = $('timeIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'timeIndicator';
            dayView.appendChild(indicator);
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
        const lastHourInMinutes = parseTime(hours[hours.length - 1]) + 60;
        const totalDurationInMinutes = lastHourInMinutes - firstHourInMinutes;

        if (currentTimeInMinutes >= firstHourInMinutes && currentTimeInMinutes <= lastHourInMinutes) {
            const minutesPassed = currentTimeInMinutes - firstHourInMinutes;
            const percentage = (minutesPassed / totalDurationInMinutes) * 100;
            indicator.style.top = `${percentage}%`;
            indicator.style.opacity = '1';
        } else {
            indicator.style.opacity = '0';
        }
    }

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
        const cell = document.createElement('div');
        const iso = d.toISOString().slice(0,10);
        cell.className = `cell ${d.getMonth() !== viewMonth ? 'otherMonth' : ''} ${iso === today.toISOString().slice(0,10) ? 'today' : ''}`;
        cell.dataset.iso = iso;
        cell.innerHTML = `<div class="dateChip">${d.getDate()}</div><div class="event-dots"></div>`;
        cell.addEventListener('click', () => onCellClick(cell.dataset.iso));
        cal.appendChild(cell);
      }
      if (monthLabel) monthLabel.textContent = new Date(viewYear, viewMonth, 1).toLocaleString('es-ES', { month: 'long' });
      if (yearLabel) yearLabel.textContent = viewYear;
    }
    
    function onCellClick(iso) {
      const localDate = new Date(iso.replace(/-/g, '/'));
      localDate.setHours(0,0,0,0);

      if(localDate < today) {
        showMessage('No puedes seleccionar fechas pasadas. Por favor, elige una fecha a partir de hoy.', 'warning');
        return;
      }
      
      container.querySelector('.day-view-active')?.classList.remove('day-view-active');
      container.classList.add('day-view-active');

      cal.querySelector('.cell.selected')?.classList.remove('selected');
      cal.querySelector(`.cell[data-iso="${iso}"]`)?.classList.add('selected');
      if (selectedDateLabel) selectedDateLabel.textContent = localDate.toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
      loadDayView(iso);
      updateCurrentTimeIndicator();
    }

    function paintDots() {
      const db = loadDB(), counts = {};
      db.appointments.forEach(a => counts[a.date] = (counts[a.date] || 0) + 1);
      cal.querySelectorAll('.cell').forEach(cell => {
        const dots = cell.querySelector('.event-dots');
        if(dots) {
          dots.innerHTML = '';
          const cnt = counts[cell.dataset.iso] || 0;
          for (let i = 0; i < Math.min(cnt, 3); i++) dots.innerHTML += '<div class="dot"></div>';
          if (cnt > 3) dots.innerHTML += '<div class="dot more"></div>';
        }
      });
    }

    function loadDayView(dateISO) {
      const db = loadDB();
      const appts = db.appointments.filter(a => a.date === dateISO).sort((a,b) => a.time.localeCompare(b.time));
      renderDay(appts, db.patients, dateISO);
    }
    
    function renderDay(appts, patients, dateISO) {
        clearInterval(timeIndicatorInterval);
        eventsCol.innerHTML = '';
        const dow = new Date(dateISO.replace(/-/g, '/')).getDay();
        const hours = workingHours(dow);
        const db = loadDB();

        hours.forEach(h => {
            const ap = appts.find(a => a.time === h);
            const blocked = db.blockedSlots.some(b => b.date === dateISO && b.time === h);
            const row = document.createElement('div');
            row.className = 'event-item';
            if (ap) {
                const p = patients.find(pp => pp.id === ap.patientId);
                if (ap.status === 'completed') row.classList.add('completed');
                row.innerHTML = `<div class="event-time">${h}</div><div class="event-body"><div class="event-patient" data-pid="${ap.patientId}">${p?.fullName || p?.name || 'Paciente desconocido'}</div><div class="event-note">${p?.reason || ''}</div></div><div class="inline-actions-slot"></div>`;
                row.querySelector('.event-patient').addEventListener('click', ev => window.location.href = `paciente_full.html?pid=${encodeURIComponent(ev.currentTarget.dataset.pid)}`);
                const slot = row.querySelector('.inline-actions-slot');
                if (ap.status === 'completed') {
                    slot.innerHTML = '<button class="action-chip completed" disabled>Finalizada</button>';
                } else {
                    const btnFinish = document.createElement('button'); btnFinish.className = 'action-chip success'; btnFinish.textContent = 'Finalizar'; btnFinish.onclick = () => finishAp(ap); slot.appendChild(btnFinish);
                    const btnRe = document.createElement('button'); btnRe.className = 'action-chip primary'; btnRe.textContent = 'Reagendar'; btnRe.onclick = () => openRebook(ap); slot.appendChild(btnRe);
                    const btnDel = document.createElement('button'); btnDel.className = 'action-chip danger'; btnDel.textContent = 'Eliminar'; btnDel.onclick = () => deleteAp(ap.id); slot.appendChild(btnDel);
                }
            } else if (blocked) {
                row.innerHTML = `<div class="event-time">${h}</div><div class="event-body"><div class="event-note blocked">Bloqueado</div></div><div class="inline-actions-slot"></div>`;
                const btn = document.createElement('button');
                btn.className = 'action-chip';
                btn.textContent = 'Desbloquear';
                btn.onclick = () => toggleBlock(dateISO, h);
                row.querySelector('.inline-actions-slot').appendChild(btn);
            } else {
                row.innerHTML = `<div class="event-time">${h}</div><div class="event-body"><div class="event-note available">Disponible</div></div><div class="inline-actions-slot"></div>`;
                const slot = row.querySelector('.inline-actions-slot');
                
                    const now = new Date();
                    const bookingCutoff = new Date(now.getTime() + 3600 * 1000); // 1 hora desde ahora
                    const slotDateTime = new Date(`${dateISO}T${h}`);

                    if (slotDateTime > bookingCutoff) {
                        const btnBook = document.createElement('button'); btnBook.className = 'action-chip primary'; btnBook.textContent = 'Agendar';
                        btnBook.onclick = () => openQuickModal(dateISO, h); 
                        slot.appendChild(btnBook);
                    }
                
                const btnBlock = document.createElement('button'); btnBlock.className = 'action-chip'; btnBlock.textContent = 'Bloquear'; btnBlock.onclick = () => toggleBlock(dateISO, h); slot.appendChild(btnBlock);
            }
            eventsCol.appendChild(row);
        });
    }

    function finalizeQuickBook(dateISO, hour, name) {
      const db = loadDB();
      if (db.appointments.some(a => a.date === dateISO && a.time === hour) || db.blockedSlots.some(b => b.date === dateISO && b.time === hour)) { showMessage('Horario no disponible', 'warning'); return; }
      let pid = null;
      // Buscar por fullName (nuevo) o name (antiguo)
      const matches = db.patients.filter(p => (p.fullName && p.fullName.toLowerCase().includes(name.toLowerCase())) || (p.name && p.name.toLowerCase().includes(name.toLowerCase())) );
      if (matches.length === 1) pid = matches[0].id;
      else if (matches.length > 1) pid = matches[0].id; // Tomar el primero si hay múltiples
      if (!pid) {
        // Crear paciente con campos separados vacíos y fullName
        const newP = { id: randId('p'), fullName: name, nombre: name, paterno: '', materno: '', createdAt: nowISO() };
        db.patients.push(newP);
        db.histories[newP.id] = db.histories[newP.id] || [];
        db.histories[newP.id].push({ id: randId('h'), timestamp: nowISO(), type: 'Creación rápida', data: { name } });
        pid = newP.id;
        showMessage('Paciente nuevo creado', 'success');
      }
      db.appointments.push({ id: randId('a'), patientId: pid, date: dateISO, time: hour, createdAt: nowISO(), status: 'active' });
      if (!db.blockedSlots.some(b => b.date === dateISO && b.time === hour)) db.blockedSlots.push({ date: dateISO, time: hour });
      db.histories[pid] = db.histories[pid] || [];
      db.histories[pid].push({ id: randId('h'), timestamp: nowISO(), type: 'Cita agendada', data: { date: dateISO, time: hour } });
      saveDB(db);
      showMessage('Cita creada y horario bloqueado', 'success');
      buildCalendar(); paintDots(); loadDayView(dateISO); updateDashboardStats();
    }

    async function openRebook(appt) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().slice(0, 10);

      const newDateISO = await showPrompt('Reagendar Cita (Paso 1 de 2)', 'Ingrese la nueva fecha (Año-Mes-Día):', tomorrowISO);
      if (!newDateISO) {
          showMessage('Reagendamiento cancelado.', 'info');
          return;
      }

      const newDate = new Date(newDateISO.replace(/-/g, '/'));
      newDate.setHours(0, 0, 0, 0);

      if (isNaN(newDate.getTime()) || newDate <= today) {
          showMessage('Fecha inválida. Solo puedes reagendar para días futuros.', 'warning');
          return;
      }

      const db = loadDB();
      const dow = newDate.getDay();
      const hours = workingHours(dow);
      const taken = db.appointments.filter(a => a.date === newDateISO).map(a => a.time);
      const blocked = db.blockedSlots.filter(b => b.date === newDateISO).map(b => b.time);
      const free = hours.filter(h => !taken.includes(h) && !blocked.includes(h));

      if (free.length === 0) {
          showMessage(`No hay horarios disponibles para el ${newDateISO}.`, 'warning');
          return;
      }
        
      const newTime = await showPrompt('Reagendar Cita (Paso 2 de 2)', `Horas disponibles para el día ${newDateISO}: ${free.join(', ')}`, free[0]);

      if (!newTime || !free.includes(newTime)) {
          showMessage('Hora inválida o reagendamiento cancelado.', 'info');
          return;
      }

      const db2 = loadDB();
      const idx = db2.appointments.findIndex(a => a.id === appt.id);
      if (idx < 0) {
          showMessage('Error: No se encontró la cita original.', 'error');
          return;
      }

      const oldDate = appt.date;
      const oldTime = appt.time;

      if (!db2.appointments.some(a => a.id !== appt.id && a.date === oldDate && a.time === oldTime)) {
          const blockedIdx = db2.blockedSlots.findIndex(b => b.date === oldDate && b.time === oldTime);
          if (blockedIdx > -1) {
              db2.blockedSlots.splice(blockedIdx, 1);
          }
      }
      
      db2.appointments[idx].date = newDateISO;
      db2.appointments[idx].time = newTime;

      if (!db2.blockedSlots.some(b => b.date === newDateISO && b.time === newTime)) {
          db2.blockedSlots.push({ date: newDateISO, time: newTime });
      }

      db2.histories[appt.patientId].push({
          id: randId('h'),
          timestamp: nowISO(),
          type: 'Reagenda',
          data: { id: appt.id, oldDate, oldTime, newDate: newDateISO, newTime }
      });

      saveDB(db2);
      showMessage('Cita reagendada con éxito.', 'success');
      
      buildCalendar();
      paintDots();
      loadDayView(newDateISO);
      updateDashboardStats();
    }

    async function toggleBlock(dateISO, hour) {
      const db = loadDB();
      const idx = db.blockedSlots.findIndex(b => b.date === dateISO && b.time === hour);
      if (db.appointments.some(a => a.date === dateISO && a.time === hour)) { showMessage('No se puede modificar: el horario está ocupado por una cita.', 'warning'); return; }
      if (idx >= 0) db.blockedSlots.splice(idx, 1); else db.blockedSlots.push({ date: dateISO, time: hour });
      saveDB(db);
      showMessage(idx >= 0 ? 'Horario desbloqueado' : 'Horario bloqueado', 'success');
      buildCalendar(); paintDots(); loadDayView(dateISO); updateDashboardStats();
    }

    async function deleteAp(apptId) {
      const confirmed = await showConfirm('Eliminar Cita', '¿Seguro que quieres eliminar esta cita? La acción es permanente.');
      if (!confirmed) return;
      const db = loadDB();
      const idx = db.appointments.findIndex(a => a.id === apptId);
      if (idx < 0) { showMessage('Cita no encontrada', 'error'); return; }
      const ap = db.appointments.splice(idx, 1)[0];
      if (!db.appointments.some(a => a.date === ap.date && a.time === ap.time)) {
        const bIdx = db.blockedSlots.findIndex(b => b.date === ap.date && b.time === ap.time);
        if (bIdx >= 0) db.blockedSlots.splice(bIdx, 1);
      }
      db.histories[ap.patientId].push({ id: randId('h'), timestamp: nowISO(), type: 'Cita eliminada', data: { id: apptId, date: ap.date, time: ap.time } });
      saveDB(db);
      showMessage('Cita eliminada', 'success');
      buildCalendar(); paintDots(); loadDayView(ap.date); updateDashboardStats();
    }

    async function finishAp(appt) {
      const confirmed = await showConfirm('Finalizar Cita', '¿Marcar esta cita como finalizada? El horario quedará bloqueado permanentemente.');
      if (!confirmed) return;
      const db = loadDB();
      const idx = db.appointments.findIndex(a => a.id === appt.id);
      if (idx < 0) { showMessage('Cita no encontrada', 'error'); return; }
      db.appointments[idx].status = 'completed';
      db.appointments[idx].completedAt = nowISO();
      if (!db.blockedSlots.some(b => b.date === appt.date && b.time === appt.time)) {
        db.blockedSlots.push({ date: appt.date, time: appt.time });
      }
      db.histories[appt.patientId].push({ id: randId('h'), timestamp: nowISO(), type: 'Cita finalizada', data: { id: appt.id, date: appt.date, time: appt.time } });
      saveDB(db);
      showMessage('Cita marcada como finalizada.', 'success');
      buildCalendar(); paintDots(); loadDayView(appt.date); updateDashboardStats();
    }
    
    prev?.addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); buildCalendar(); paintDots(); });
    next?.addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); buildCalendar(); paintDots(); });
    
    buildCalendar();
    paintDots();
    updateDashboardStats();
    timeIndicatorInterval = setInterval(updateCurrentTimeIndicator, 60000);
}

// ---------- MÓDULO DE HISTORIAL Y DETALLE DE PACIENTE ----------
function initHistoryPage() {
    const container = $('patientListContainer');
    if (!container) return;
    const searchInput = $('patientSearchInput');
    let db = loadDB();
    // Compatibilidad: ordenar por fullName (nuevo) o name (antiguo)
    let patients = db.patients.sort((a,b) => (a.fullName || a.name).localeCompare(b.fullName || b.name));

    function renderPatientList(patientArray) {
      container.innerHTML = '';
      patientArray.forEach(p => {
        const item = document.createElement('a');
        item.className = 'patient-list-item';
        item.href = `paciente_full.html?pid=${encodeURIComponent(p.id)}`;
        item.innerHTML = `
          <div class="patient-info">
              <div class="patient-list-name">${p.fullName || p.name}</div>
              <div class="patient-list-curp"><strong>RFC:</strong> ${p.rfc || 'No registrado'}</div>
          </div>
        `;
        container.appendChild(item);
      });
    }
    
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      renderPatientList(patients.filter(p => (p.fullName || p.name).toLowerCase().includes(query) || (p.rfc && p.rfc.toLowerCase().includes(query))));
    });

    renderPatientList(patients);
}

function reprintPrescription(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar la receta en el historial.', 'error');
        return;
    }

    const medications = historyEvent.data.medications;
    const recommendations = historyEvent.data.recommendations;
    generatePrintWindow(patient, medications, recommendations);
}

function reprintReport(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el reporte en el historial.', 'error');
        return;
    }
    generateReportPrintWindow(patient, historyEvent.data);
}

function reprintParteMedico(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el parte médico en el historial.', 'error');
        return;
    }
    generateParteMedicoPrintWindow(patient, historyEvent.data);
}

function reprintDiagnosis(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el diagnóstico en el historial.', 'error');
        return;
    }
    generateDiagnosisPrintWindow(patient, historyEvent.data);
}

function reprintStudy(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el estudio en el historial.', 'error');
        return;
    }
    generateStudyPrintWindow(patient, historyEvent.data);
}

function reprintPayment(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el registro de pago en el historial.', 'error');
        return;
    }
    generatePaymentPrintWindow(patient, historyEvent.data);
}


function initPatientDetailPage() {
    const patientNameHeader = $('patientNameHeader');
    const patientInfoEl = $('patientInfo');
    const patientHistoryEl = $('patientHistory');
    const editPatientLink = $('editPatientLink');
    const createParteMedicoLink = $('createParteMedicoLink');
    const printHistoryBtn = $('printHistoryBtn');
    
    if (!patientInfoEl) return;

    const params = new URL(window.location.href).searchParams;
    const patientId = params.get('pid');
    if (!patientId) {
      patientInfoEl.innerHTML = '<h2>Paciente no especificado</h2>'; return;
    }

    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    if (!patient) {
      patientInfoEl.innerHTML = '<h2>Paciente no encontrado</h2>'; return;
    }

    const history = (db.histories[patientId] || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (patientNameHeader) patientNameHeader.textContent = patient.fullName || patient.name;
    if (editPatientLink) editPatientLink.href = `paciente.html?edit=${encodeURIComponent(patientId)}`;
    if (createParteMedicoLink) createParteMedicoLink.href = `parte_medico.html?pid=${encodeURIComponent(patientId)}`;
    
    const esc = (s='') => String(s||'');

    let surgeriesHtml = '—';
    if (Array.isArray(patient.surgeries) && patient.surgeries.length > 0) {
        surgeriesHtml = '<ul style="margin: 0; padding-left: 20px;">' + patient.surgeries.map(s => 
            `<li><strong>${s.date || 'Fecha no especificada'}:</strong> ${s.procedure || 'Procedimiento no especificado'}. <em>${s.complication ? 'Complicaciones: ' + s.complication : ''}</em></li>`
        ).join('') + '</ul>';
    }
    
    // Calcular edad para mostrar
    const displayAge = patient.age || calculateAge(patient.birthdate);

    const patientInfoHTML = `
        <div><strong>Edad:</strong> ${esc(displayAge || '—')}</div>
        <div><strong>Sexo:</strong> ${esc(patient.sex||'—')}</div>
        <div><strong>Teléfono:</strong> ${esc(patient.phone||'—')}</div>
        <div><strong>RFC:</strong> ${esc(patient.rfc||'—')}</div>
        <div style="grid-column: 1 / -1;"><strong>Alergias:</strong> ${(patient.allergies && patient.allergies.length) ? esc(patient.allergies.join(', ')) : '—'}</div>
        <div style="grid-column: 1 / -1;"><strong>Enfermedades crónicas:</strong> ${(patient.chronic && patient.chronic.length) ? esc(patient.chronic.join(', ')) : '—'}</div>
        <div style="grid-column: 1 / -1;"><strong>Cirugías Previas:</strong> ${surgeriesHtml}</div>
        <div style="grid-column: 1 / -1;"><strong>Medicación:</strong> ${(patient.medications && patient.medications.length) ? esc(patient.medications.join(', ')) : '—'}</div>
        <div style="grid-column: 1 / -1;"><strong>Consumo de sustancias:</strong> ${patient.substance ? (patient.substance + (patient.substanceDetail && patient.substanceDetail.name ? ` — ${patient.substanceDetail.name} (${patient.substanceDetail.frequency || ''})` : '')) : '—'}</div>
        <div style="grid-column: 1 / -1;"><strong>Motivo de consulta inicial:</strong> ${esc(patient.reason||'—')}</div>
        <div style="grid-column: 1 / -1;"><strong>Síntomas iniciales:</strong> ${esc(patient.symptoms||'—')}</div>
    `;
    patientInfoEl.innerHTML = patientInfoHTML;
    
    const formatHistoryDataForDetail = (h) => {
        const { type, data } = h;
        if (!data) return '';
        let content = '';
        
        const editBaseUrl = {
            'Receta emitida': 'receta.html',
            'Parte Médico': 'parte_medico.html',
            'Diagnóstico': 'diagnostico.html',
            'Estudio Médico': 'estudio.html',
            'Registro de Pago': 'pago.html',
        };
        const editUrl = editBaseUrl[type] ? `${editBaseUrl[type]}?edit_hid=${h.id}&pid=${patientId}` : null;
        const editButton = editUrl ? `<a href="${editUrl}" class="action-chip" style="margin-left: 8px;">Editar</a>` : '';

        switch (type) {
            case 'Receta emitida': {
                const medsList = data.medications.map(med => `<li><strong>${esc(med.name)} ${esc(med.dose)}</strong> - ${esc(med.freq)} por ${esc(med.dur)}</li>`).join('');
                const recommendations = data.recommendations ? `<p style="margin-top:10px;"><strong>Recomendaciones:</strong> ${esc(data.recommendations)}</p>` : '';
                const reprintButton = `<button class="action-chip primary reprint-rx-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<ul style="margin-top: 8px; padding-left: 20px;">${medsList}</ul>${recommendations}<div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Parte Médico': {
                const reprintButton = `<button class="action-chip primary reprint-parte-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<p><strong>Análisis:</strong> ${esc(data.analysis).substring(0, 100)}...</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Diagnóstico': {
                const reprintButton = `<button class="action-chip primary reprint-diag-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<p><strong>Diagnóstico:</strong> ${esc(data.title)}</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Estudio Médico': {
                const imagePreviews = (data.images || []).map(imgData => `<img src="${imgData}" style="max-width: 100px; max-height: 100px; margin: 5px; border-radius: 4px;" />`).join('');
                const reprintButton = `<button class="action-chip primary reprint-study-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `
                    <p><strong>Parte del Cuerpo:</strong> ${esc(data.bodyPart)} (${esc(data.date)})</p>
                    <p><strong>Hallazgos:</strong> ${esc(data.findings).substring(0, 100)}...</p>
                    <div>${imagePreviews}</div>
                    <div>${reprintButton}${editButton}</div> 
                `;
                break;
            }
            case 'Registro de Pago': {
                const reprintButton = `<button class="action-chip primary reprint-payment-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<p><strong>Concepto:</strong> ${esc(data.concept)}</p><p><strong>Monto:</strong> $${esc(data.amount)} (${esc(data.method)})</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Cita agendada':
            case 'Cita eliminada':
            case 'Cita finalizada':
                content = `Fecha: ${data.date}, Hora: ${data.time}`;
                break;
            case 'Reagenda':
                content = `Cita movida de ${data.oldDate} ${data.oldTime} para ${data.newDate} ${data.newTime}.`;
                break;
            default:
                return '';
        }
        return `<div>${content}</div>`;
    };

    const renderHistorySection = (title, events) => {
        if (!events || events.length === 0) return '';
        
        const eventsHtml = events.map(h => {
            const formattedData = formatHistoryDataForDetail(h);
            // MODIFICADO: Asegura que 'Registro de Pago' y 'Parte Médico' muestren el título correcto
            let titleText = h.type;
            if (h.type === 'Reporte Médico' || h.type === 'Diagnóstico') {
                titleText = h.data.title;
            } else if (h.type === 'Estudio Médico') {
                titleText = h.data.type;
            } else if (h.type === 'Registro de Pago') {
                titleText = h.type; // Mantiene "Registro de Pago"
            } else if (h.type === 'Parte Médico') {
                titleText = h.type; // Mantiene "Parte Médico"
            }

            return `<div class="history-entry"><strong>${esc(titleText)}</strong> — ${new Date(h.timestamp).toLocaleString('es-ES',{dateStyle:'full', timeStyle:'short'})}${formattedData}</div>`;
        }).join('');

        return `<h4 class="history-section-title">${title}</h4>${eventsHtml}`;
    };

    const prescriptionEvents = history.filter(h => h.type === 'Receta emitida');
    const reportEvents = history.filter(h => h.type === 'Reporte Médico');
    const diagnosisEvents = history.filter(h => h.type === 'Diagnóstico');
    const studyEvents = history.filter(h => h.type === 'Estudio Médico');
    const paymentEvents = history.filter(h => h.type === 'Registro de Pago');
    const appointmentEvents = history.filter(h => ['Cita agendada', 'Cita eliminada', 'Cita finalizada', 'Reagenda'].includes(h.type));
    const adminEvents = history.filter(h => ['Registro inicial', 'Edición'].includes(h.type));

    let historyHtml = [
        renderHistorySection('Recetas Emitidas', prescriptionEvents),
        renderHistorySection('Diagnósticos', diagnosisEvents),
        renderHistorySection('Estudios Médicos', studyEvents),
        renderHistorySection('Partes Médicos', parteMedicoEvents),
        renderHistorySection('Registros de Pago', paymentEvents),
        renderHistorySection('Actividad de Citas', appointmentEvents),
        renderHistorySection('Actividad Administrativa', adminEvents)
    ].join('');

    if (!historyHtml.trim()) {
        historyHtml = '<p>No hay historial de actividad para este paciente.</p>';
    }
        
    patientHistoryEl.innerHTML = `<h3 style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">Historial de Actividad</h3>${historyHtml}`;
    
    // Event listener unificado para todos los botones de reimpresión
    patientHistoryEl.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target || !target.dataset.historyId) return;
        
        const historyId = target.dataset.historyId;

        if (target.classList.contains('reprint-rx-btn')) reprintPrescription(patientId, historyId);
        else if (target.classList.contains('reprint-parte-btn')) reprintParteMedico(patientId, historyId);
        else if (target.classList.contains('reprint-diag-btn')) reprintDiagnosis(patientId, historyId);
        else if (target.classList.contains('reprint-study-btn')) reprintStudy(patientId, historyId);
        else if (target.classList.contains('reprint-payment-btn')) reprintPayment(patientId, historyId);
    });

    const dangerZoneEl = $('dangerZone');
    if(dangerZoneEl) dangerZoneEl.style.display = 'block';
    $('deletePatientBtn')?.addEventListener('click', () => deletePatient(patientId));
    
    printHistoryBtn?.addEventListener('click', () => {
        generateHistoryPrintWindow(patient, history);
    });
}
  
async function deletePatient(patientId, options = { redirect: true }) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    if (!patient) return false;
    const patientName = patient.fullName || patient.name;
    const confirmed1 = await showConfirm('¿Eliminar Paciente?', `Estás a punto de eliminar a ${patientName}. Se borrará todo su historial y citas.`);
    if (!confirmed1) return false;
    const confirmed2 = await showPrompt('Confirmación Final', `Esta acción es PERMANENTE. Para confirmar, escribe "BORRAR ${patientName}".`);
    if (confirmed2 !== `BORRAR ${patientName}`) {
      showMessage('La confirmación no coincide. Acción cancelada.', 'warning');
      return false;
    }
    const patientIndex = db.patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) return false;
    const slotsToPotentiallyUnblock = db.appointments.filter(appt => appt.patientId === patientId).map(appt => ({ date: appt.date, time: appt.time }));
    db.patients.splice(patientIndex, 1);
    delete db.histories[patientId];
    db.appointments = db.appointments.filter(appt => appt.patientId !== patientId);
    slotsToPotentiallyUnblock.forEach(slot => {
      const isSlotStillUsed = db.appointments.some(appt => appt.date === slot.date && appt.time === slot.time);
      if (!isSlotStillUsed) {
        const blockedIndex = db.blockedSlots.findIndex(b => b.date === slot.date && b.time === slot.time);
        if (blockedIndex > -1) db.blockedSlots.splice(blockedIndex, 1);
      }
    });
    saveDB(db);
    showMessage(`Paciente ${patientName} y todos sus datos han sido eliminados.`, 'success', 5000);
    if (options.redirect) {
      window.location.href = 'historial.html';
    }
    return true;
}

// ---------- MÓDULO DE HISTORIAL Y DETALLE DE PACIENTE ----------
function initHistoryPage() {
    const container = $('patientListContainer');
    if (!container) return;
    const searchInput = $('patientSearchInput');
    let db = loadDB();
    // Compatibilidad: ordenar por fullName (nuevo) o name (antiguo)
    let patients = db.patients.sort((a,b) => (a.fullName || a.name).localeCompare(b.fullName || b.name));

    function renderPatientList(patientArray) {
      container.innerHTML = '';
      patientArray.forEach(p => {
        const item = document.createElement('a');
        item.className = 'patient-list-item';
        item.href = `paciente_full.html?pid=${encodeURIComponent(p.id)}`;
        item.innerHTML = `
          <div class="patient-info">
              <div class="patient-list-name">${p.fullName || p.name}</div>
              <div class="patient-list-curp"><strong>RFC:</strong> ${p.rfc || 'No registrado'}</div>
          </div>
        `;
        container.appendChild(item);
      });
    }
    
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase().trim();
      renderPatientList(patients.filter(p => (p.fullName || p.name).toLowerCase().includes(query) || (p.rfc && p.rfc.toLowerCase().includes(query))));
    });

    renderPatientList(patients);
}

function reprintPrescription(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar la receta en el historial.', 'error');
        return;
    }

    const medications = historyEvent.data.medications;
    const recommendations = historyEvent.data.recommendations;
    generatePrintWindow(patient, medications, recommendations);
}

function reprintReport(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el reporte en el historial.', 'error');
        return;
    }
    generateReportPrintWindow(patient, historyEvent.data);
}

function reprintParteMedico(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el parte médico en el historial.', 'error');
        return;
    }
    generateParteMedicoPrintWindow(patient, historyEvent.data);
}

function reprintDiagnosis(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el diagnóstico en el historial.', 'error');
        return;
    }
    generateDiagnosisPrintWindow(patient, historyEvent.data);
}

function reprintStudy(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el estudio en el historial.', 'error');
        return;
    }
    generateStudyPrintWindow(patient, historyEvent.data);
}

function reprintPayment(patientId, historyId) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    const history = (db.histories[patientId] || []);
    const historyEvent = history.find(h => h.id === historyId);

    if (!patient || !historyEvent) {
        showMessage('No se pudo encontrar el registro de pago en el historial.', 'error');
        return;
    }
    generatePaymentPrintWindow(patient, historyEvent.data);
}


function initPatientDetailPage() {
    const patientNameHeader = $('patientNameHeader');
    const patientInfoEl = $('patientInfo');
    const patientHistoryEl = $('patientHistory');
    const editPatientLink = $('editPatientLink');
    const createParteMedicoLink = $('createParteMedicoLink');
    const createReportLink = $('createReportLink');
    const printHistoryBtn = $('printHistoryBtn');
    
    if (!patientInfoEl) return;

    const params = new URL(window.location.href).searchParams;
    const patientId = params.get('pid');
    if (!patientId) {
      patientInfoEl.innerHTML = '<h2>Paciente no especificado</h2>'; return;
    }

    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    if (!patient) {
      patientInfoEl.innerHTML = '<h2>Paciente no encontrado</h2>'; return;
    }

    const history = (db.histories[patientId] || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (patientNameHeader) patientNameHeader.textContent = patient.fullName || patient.name;
    if (editPatientLink) editPatientLink.href = `paciente.html?edit=${encodeURIComponent(patientId)}`;
    if (createParteMedicoLink) createParteMedicoLink.href = `parte_medico.html?pid=${encodeURIComponent(patientId)}`;
    if (createReportLink) createReportLink.href = `reporte.html?pid=${encodeURIComponent(patientId)}`;
    
    const esc = (s='') => String(s||'');

    let surgeriesHtml = '—';
    if (Array.isArray(patient.surgeries) && patient.surgeries.length > 0) {
        surgeriesHtml = '<ul style="margin: 0; padding-left: 20px;">' + patient.surgeries.map(s => 
            `<li><strong>${s.date || 'Fecha no especificada'}:</strong> ${s.procedure || 'Procedimiento no especificado'}. <em>${s.complication ? 'Complicaciones: ' + s.complication : ''}</em></li>`
        ).join('') + '</ul>';
    }
    
    // Calcular edad para mostrar
    const displayAge = patient.age || calculateAge(patient.birthdate);

    const patientInfoHTML = `
        <div><strong>Edad:</strong> ${esc(displayAge || '—')}</div>
        <div><strong>Sexo:</strong> ${esc(patient.sex||'—')}</div>
        <div><strong>Teléfono:</strong> ${esc(patient.phone||'—')}</div>
        <div><strong>RFC:</strong> ${esc(patient.rfc||'—')}</div>
        <div style="grid-column: 1 / -1;"><strong>Alergias:</strong> ${(patient.allergies && patient.allergies.length) ? esc(patient.allergies.join(', ')) : '—'}</div>
        <div style="grid-column: 1 / -1;"><strong>Enfermedades crónicas:</strong> ${(patient.chronic && patient.chronic.length) ? esc(patient.chronic.join(', ')) : '—'}</div>
        <div style="grid-column: 1 / -1;"><strong>Cirugías Previas:</strong> ${surgeriesHtml}</div>
        <div style="grid-column: 1 / -1;"><strong>Medicación:</strong> ${(patient.medications && patient.medications.length) ? esc(patient.medications.join(', ')) : '—'}</div>
        <div style="grid-column: 1 / -1;"><strong>Consumo de sustancias:</strong> ${patient.substance ? (patient.substance + (patient.substanceDetail && patient.substanceDetail.name ? ` — ${patient.substanceDetail.name} (${patient.substanceDetail.frequency || ''})` : '')) : '—'}</div>
        <div style="grid-column: 1 / -1;"><strong>Motivo de consulta inicial:</strong> ${esc(patient.reason||'—')}</div>
        <div style="grid-column: 1 / -1;"><strong>Síntomas iniciales:</strong> ${esc(patient.symptoms||'—')}</div>
    `;
    patientInfoEl.innerHTML = patientInfoHTML;
    
    const formatHistoryDataForDetail = (h) => {
        const { type, data } = h;
        if (!data) return '';
        let content = '';
        
        const editBaseUrl = {
            'Receta emitida': 'receta.html',
            'Reporte Médico': 'reporte.html',
            'Parte Médico': 'parte_medico.html',
            'Diagnóstico': 'diagnostico.html',
            'Estudio Médico': 'estudio.html',
            'Registro de Pago': 'pago.html',
        };
        const editUrl = editBaseUrl[type] ? `${editBaseUrl[type]}?edit_hid=${h.id}&pid=${patientId}` : null;
        const editButton = editUrl ? `<a href="${editUrl}" class="action-chip" style="margin-left: 8px;">Editar</a>` : '';

        switch (type) {
            case 'Receta emitida': {
                const medsList = data.medications.map(med => `<li><strong>${esc(med.name)} ${esc(med.dose)}</strong> - ${esc(med.freq)} por ${esc(med.dur)}</li>`).join('');
                const recommendations = data.recommendations ? `<p style="margin-top:10px;"><strong>Recomendaciones:</strong> ${esc(data.recommendations)}</p>` : '';
                const reprintButton = `<button class="action-chip primary reprint-rx-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<ul style="margin-top: 8px; padding-left: 20px;">${medsList}</ul>${recommendations}<div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Reporte Médico': {
                const reprintButton = `<button class="action-chip primary reprint-report-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<p><strong>Título:</strong> ${esc(data.title)}</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Parte Médico': {
                const reprintButton = `<button class="action-chip primary reprint-parte-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<p><strong>Análisis:</strong> ${esc(data.analysis).substring(0, 100)}...</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Diagnóstico': {
                const reprintButton = `<button class="action-chip primary reprint-diag-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<p><strong>Diagnóstico:</strong> ${esc(data.title)}</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Estudio Médico': {
                const imagePreviews = (data.images || []).map(imgData => `<img src="${imgData}" style="max-width: 100px; max-height: 100px; margin: 5px; border-radius: 4px;" />`).join('');
                const reprintButton = `<button class="action-chip primary reprint-study-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `
                    <p><strong>Parte del Cuerpo:</strong> ${esc(data.bodyPart)} (${esc(data.date)})</p>
                    <p><strong>Hallazgos:</strong> ${esc(data.findings).substring(0, 100)}...</p>
                    <div>${imagePreviews}</div>
                    <div>${reprintButton}${editButton}</div> 
                `;
                break;
            }
            case 'Registro de Pago': {
                const reprintButton = `<button class="action-chip primary reprint-payment-btn" data-history-id="${h.id}" style="margin-top:10px;">Reimprimir</button>`;
                content = `<p><strong>Concepto:</strong> ${esc(data.concept)}</p><p><strong>Monto:</strong> $${esc(data.amount)} (${esc(data.method)})</p><div>${reprintButton}${editButton}</div>`;
                break;
            }
            case 'Cita agendada':
            case 'Cita eliminada':
            case 'Cita finalizada':
                content = `Fecha: ${data.date}, Hora: ${data.time}`;
                break;
            case 'Reagenda':
                content = `Cita movida de ${data.oldDate} ${data.oldTime} para ${data.newDate} ${data.newTime}.`;
                break;
            default:
                return '';
        }
        return `<div>${content}</div>`;
    };

    const renderHistorySection = (title, events) => {
        if (!events || events.length === 0) return '';
        
        const eventsHtml = events.map(h => {
            const formattedData = formatHistoryDataForDetail(h);
            // MODIFICADO: Asegura que 'Registro de Pago' y 'Parte Médico' muestren el título correcto
            let titleText = h.type;
            if (h.type === 'Reporte Médico' || h.type === 'Diagnóstico') {
                titleText = h.data.title;
            } else if (h.type === 'Estudio Médico') {
                titleText = h.data.type;
            } else if (h.type === 'Registro de Pago') {
                titleText = h.type; // Mantiene "Registro de Pago"
            } else if (h.type === 'Parte Médico') {
                titleText = h.type; // Mantiene "Parte Médico"
            }

            return `<div class="history-entry"><strong>${esc(titleText)}</strong> — ${new Date(h.timestamp).toLocaleString('es-ES',{dateStyle:'full', timeStyle:'short'})}${formattedData}</div>`;
        }).join('');

        return `<h4 class="history-section-title">${title}</h4>${eventsHtml}`;
    };

    const prescriptionEvents = history.filter(h => h.type === 'Receta emitida');
    const reportEvents = history.filter(h => h.type === 'Reporte Médico');
    const parteMedicoEvents = history.filter(h => h.type === 'Parte Médico');
    const diagnosisEvents = history.filter(h => h.type === 'Diagnóstico');
    const studyEvents = history.filter(h => h.type === 'Estudio Médico');
    const paymentEvents = history.filter(h => h.type === 'Registro de Pago');
    const appointmentEvents = history.filter(h => ['Cita agendada', 'Cita eliminada', 'Cita finalizada', 'Reagenda'].includes(h.type));
    const adminEvents = history.filter(h => ['Registro inicial', 'Edición'].includes(h.type));

    let historyHtml = [
        renderHistorySection('Recetas Emitidas', prescriptionEvents),
        renderHistorySection('Diagnósticos', diagnosisEvents),
        renderHistorySection('Estudios Médicos', studyEvents),
        renderHistorySection('Reportes y Partes Médicos', [...reportEvents, ...parteMedicoEvents]),
        renderHistorySection('Registros de Pago', paymentEvents),
        renderHistorySection('Actividad de Citas', appointmentEvents),
        renderHistorySection('Actividad Administrativa', adminEvents)
    ].join('');

    if (!historyHtml.trim()) {
        historyHtml = '<p>No hay historial de actividad para este paciente.</p>';
    }
        
    patientHistoryEl.innerHTML = `<h3 style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">Historial de Actividad</h3>${historyHtml}`;
    
    // Event listener unificado para todos los botones de reimpresión
    patientHistoryEl.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target || !target.dataset.historyId) return;
        
        const historyId = target.dataset.historyId;

        if (target.classList.contains('reprint-rx-btn')) reprintPrescription(patientId, historyId);
        else if (target.classList.contains('reprint-report-btn')) reprintReport(patientId, historyId);
        else if (target.classList.contains('reprint-parte-btn')) reprintParteMedico(patientId, historyId);
        else if (target.classList.contains('reprint-diag-btn')) reprintDiagnosis(patientId, historyId);
        else if (target.classList.contains('reprint-study-btn')) reprintStudy(patientId, historyId);
        else if (target.classList.contains('reprint-payment-btn')) reprintPayment(patientId, historyId);
    });

    const dangerZoneEl = $('dangerZone');
    if(dangerZoneEl) dangerZoneEl.style.display = 'block';
    $('deletePatientBtn')?.addEventListener('click', () => deletePatient(patientId));
    
    printHistoryBtn?.addEventListener('click', () => {
        generateHistoryPrintWindow(patient, history);
    });
}
  
async function deletePatient(patientId, options = { redirect: true }) {
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    if (!patient) return false;
    const patientName = patient.fullName || patient.name;
    const confirmed1 = await showConfirm('¿Eliminar Paciente?', `Estás a punto de eliminar a ${patientName}. Se borrará todo su historial y citas.`);
    if (!confirmed1) return false;
    const confirmed2 = await showPrompt('Confirmación Final', `Esta acción es PERMANENTE. Para confirmar, escribe "BORRAR ${patientName}".`);
    if (confirmed2 !== `BORRAR ${patientName}`) {
      showMessage('La confirmación no coincide. Acción cancelada.', 'warning');
      return false;
    }
    const patientIndex = db.patients.findIndex(p => p.id === patientId);
    if (patientIndex === -1) return false;
    const slotsToPotentiallyUnblock = db.appointments.filter(appt => appt.patientId === patientId).map(appt => ({ date: appt.date, time: appt.time }));
    db.patients.splice(patientIndex, 1);
    delete db.histories[patientId];
    db.appointments = db.appointments.filter(appt => appt.patientId !== patientId);
    slotsToPotentiallyUnblock.forEach(slot => {
      const isSlotStillUsed = db.appointments.some(appt => appt.date === slot.date && appt.time === slot.time);
      if (!isSlotStillUsed) {
        const blockedIndex = db.blockedSlots.findIndex(b => b.date === slot.date && b.time === slot.time);
        if (blockedIndex > -1) db.blockedSlots.splice(blockedIndex, 1);
      }
    });
    saveDB(db);
    showMessage(`Paciente ${patientName} y todos sus datos han sido eliminados.`, 'success', 5000);
    if (options.redirect) {
      window.location.href = 'historial.html';
    }
    return true;
}

function initRecetaPage() {
    const form = $('prescriptionForm');
    if (!form) return;

    const params = new URL(window.location.href).searchParams;
    let patientIdParam = params.get('pid'); // Puede ser null si se crea
    const editHistoryId = params.get('edit_hid');

    const db = loadDB();
    const patientSelect = $('patientSelect');
    const medicationsContainer = $('medicationsContainer');
    const recommendationsInput = $('recommendations');

    patientSelect.innerHTML = '<option value="">Seleccione un paciente</option>';
    db.patients.sort((a,b) => (a.fullName || a.name).localeCompare(b.fullName || b.name)).forEach(p => {
      patientSelect.innerHTML += `<option value="${p.id}">${p.fullName || p.name}</option>`;
    });

    const addMedicationBlock = (data = {}) => {
      const medId = randId('med');
      const block = document.createElement('div');
      block.className = 'medication-group';
      block.id = medId;
      block.style.position = 'relative';
      block.innerHTML = `
        <button type="button" class="btn danger" data-med-id="${medId}" style="position:absolute; top:10px; right:10px; padding: 2px 8px; font-size: 14px;">×</button>
        <label>Medicamento<input type="text" class="med-name" required placeholder="Ej. Amoxicilina" value="${data.name || ''}"></label>
        <div class="grid-2">
            <label>Dosis<input type="text" class="med-dose" placeholder="Ej. 500 mg" value="${data.dose || ''}"></label>
            <label>Presentación<input type="text" class="med-form" placeholder="Ej. Cápsulas" value="${data.form || ''}"></label>
        </div>
        <div class="grid-2">
            <label>Frecuencia<input type="text" class="med-freq" required placeholder="Ej. Cada 8 horas" value="${data.freq || ''}"></label>
            <label>Duración<input type="text" class="med-dur" required placeholder="Ej. Por 7 días" value="${data.dur || ''}"></label>
        </div>
        <label>Indicaciones adicionales<textarea class="med-instr" placeholder="Ej. Tomar con alimentos">${data.instr || ''}</textarea></label>`;
      medicationsContainer.appendChild(block);
    };
    
    // MODO EDICIÓN: Cargar datos si se está editando
    if (editHistoryId) {
        if (!patientIdParam) { // Asegurarse de que el ID del paciente esté presente
            const historyEntry = Object.values(db.histories).flat().find(h => h.id === editHistoryId);
            if (historyEntry) {
                patientIdParam = Object.keys(db.histories).find(key => db.histories[key].includes(historyEntry));
            }
        }

        if (patientIdParam) {
            document.title = "Editar Receta Médica";
            const history = (db.histories[patientIdParam] || []);
            const historyEvent = history.find(h => h.id === editHistoryId);

            if (historyEvent && historyEvent.type === 'Receta emitida') {
                const data = historyEvent.data;
                patientSelect.value = patientIdParam;
                patientSelect.disabled = true;

                medicationsContainer.innerHTML = ''; // Limpiar el bloque vacío
                (data.medications || []).forEach(med => addMedicationBlock(med));
                
                if (recommendationsInput) recommendationsInput.value = data.recommendations || '';
            }
        }
    } else {
        // MODO CREACIÓN: Añadir un bloque vacío
        medicationsContainer.innerHTML = ''; 
        addMedicationBlock();
    }

    $('addMedicationBtn').addEventListener('click', () => addMedicationBlock());

    medicationsContainer.addEventListener('click', e => {
      if (e.target.dataset.medId) {
        $(e.target.dataset.medId)?.remove();
      }
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      
      // Si estamos editando, el patientIdParam ya tiene valor. Si no, lo tomamos del select.
      const patientId = patientIdParam || patientSelect.value;

      if (!patientId) { showMessage('Por favor, selecciona un paciente.', 'warning'); return; }
      const patient = db.patients.find(p => p.id === patientId);

      const medications = [];
      const medGroups = medicationsContainer.querySelectorAll('.medication-group');
      if(medGroups.length === 0) { showMessage('Debes añadir al menos un medicamento.', 'warning'); return; }
      medGroups.forEach(group => {
        medications.push({
          name: group.querySelector('.med-name').value,
          dose: group.querySelector('.med-dose').value,
          form: group.querySelector('.med-form').value,
          freq: group.querySelector('.med-freq').value,
          dur: group.querySelector('.med-dur').value,
          instr: group.querySelector('.med-instr').value,
        });
      });

      const recommendations = recommendationsInput ? recommendationsInput.value : '';
      const db_to_save = loadDB();
      db_to_save.histories[patientId] = db_to_save.histories[patientId] || [];
      
      const recipeData = { 
          medications: medications, 
          recommendations: recommendations 
      };

      if (editHistoryId) {
          // MODO ACTUALIZACIÓN: Encuentra y actualiza el registro existente
          const historyIndex = db_to_save.histories[patientId].findIndex(h => h.id === editHistoryId);
          if (historyIndex > -1) {
              db_to_save.histories[patientId][historyIndex].data = recipeData;
              db_to_save.histories[patientId][historyIndex].timestamp = nowISO(); // Actualiza la fecha de modificación
          }
      } else {
          // MODO CREACIÓN: Crea un nuevo registro en el historial
          db_to_save.histories[patientId].push({
            id: randId('h'),
            timestamp: nowISO(),
            type: 'Receta emitida',
            data: recipeData
          });
      }

      saveDB(db_to_save);
      generatePrintWindow(patient, medications, recommendations);
      showMessage('Receta guardada en el historial.', 'success');
      
      if (!editHistoryId) { // Solo limpia el formulario si estamos creando
        form.reset();
        medicationsContainer.innerHTML = '';
        addMedicationBlock();
        patientSelect.value = '';
      } else {
        setTimeout(() => { // Si estamos editando, redirige al historial
            window.location.href = `paciente_full.html?pid=${patientId}`;
        }, 1000);
      }
    });
}

function initReportPage() {
    const btnReportePagos = $('btnReportePagos');
    const btnReporteCitas = $('btnReporteCitas');
    const btnReporteRecetas = $('btnReporteRecetas');
    const resultContainer = $('reportResultContainer');
    
    if (!btnReportePagos) return; // Salir si no estamos en la página de reportes

    const db = loadDB();
    const allPatients = db.patients;
    const allHistories = db.histories;

    /**
     * Función interna para mostrar el contenido del reporte y el botón de imprimir.
     * @param {string} title - Título del reporte (para impresión).
     * @param {string} contentHtml - El HTML del contenido del reporte.
     */
    function displayReport(title, contentHtml) {
        resultContainer.innerHTML = `
            <button type="button" id="btnPrintCurrentReport" class="btn primary" style="float: right;">Imprimir</button>
            <h4 style="margin-top: 0;">${title}</h4>
            <div id="reportContentToPrint">
                ${contentHtml}
            </div>
        `;

        // Añadir listener al nuevo botón de imprimir
        $('btnPrintCurrentReport').addEventListener('click', () => {
            const reportContent = $('reportContentToPrint').innerHTML;
            const printHeader = getPrintHeader();
            const printFooter = getPrintFooter();
            
            // Usamos un paciente "genérico" para la impresión, ya que es un reporte general
            const fakePatient = { fullName: "Reporte General", name: "Reporte General" }; 
            
            // Llamamos a openPrintPreview con los datos
            openPrintPreview(title, printHeader + reportContent + printFooter);
        });
    }

    // --- Reporte 1: Pagos y Facturación ---
    btnReportePagos.addEventListener('click', () => {
        let html = '';
        let hasEntries = false;
        
        allPatients.forEach(patient => {
            const payments = (allHistories[patient.id] || []).filter(h => h.type === 'Registro de Pago');
            if (payments.length > 0) {
                hasEntries = true;
                html += `<h5>${patient.fullName || patient.name}</h5>`;
                html += '<ul>';
                payments.forEach(p => {
                    const data = p.data;
                    let facturacionStatus = '';
                    if (data.method === 'Efectivo') {
                        facturacionStatus = '<span style="color: #888;">No se puede facturar (pago en efectivo)</span>';
                    } else {
                        if (data.facturado) {
                            facturacionStatus = data.facturaEmitida 
                                ? '<span style="color: green;">Facturado (Factura Emitida)</span>' 
                                : '<span style="color: orange;">Facturado (Pendiente de Emisión)</span>';
                        } else {
                            facturacionStatus = '<span style="color: red;">No Facturado</span>';
                        }
                    }
                    html += `<li>$${data.amount} (${data.method}) - ${facturacionStatus}</li>`;
                });
                html += '</ul>';
            }
        });
        
        if (!hasEntries) {
            html += '<p>No se encontraron registros de pago.</p>';
        }
        displayReport('Reporte de Pagos y Facturación', html);
    });

    // --- Reporte 2: Citas ---
    btnReporteCitas.addEventListener('click', () => {
        const periodo = $('reporteCitasPeriodo').value;
        const now = new Date();
        let limitDate = new Date(0); // Fecha muy antigua (para 'general')

        if (periodo === 'mensual') {
            limitDate.setDate(now.getDate() - 30);
        } else if (periodo === 'semanal') {
            limitDate.setDate(now.getDate() - 7);
        }

        let html = '';
        let appointments = db.appointments
            .filter(a => new Date(a.date) >= limitDate)
            .sort((a,b) => new Date(a.date) - new Date(b.date));
        
        if (appointments.length > 0) {
            html += '<ul>';
            appointments.forEach(appt => {
                const patient = allPatients.find(p => p.id === appt.patientId);
                const patientName = patient ? (patient.fullName || patient.name) : 'Paciente Desconocido';
                html += `<li><strong>${appt.date}</strong> - ${patientName}</li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>No se encontraron citas en este periodo.</p>';
        }
        displayReport(`Reporte de Citas (${periodo})`, html);
    });

    // --- Reporte 3: Recetas ---
    btnReporteRecetas.addEventListener('click', () => {
        let html = '';
        let hasEntries = false;

        allPatients.forEach(patient => {
            const prescriptions = (allHistories[patient.id] || []).filter(h => h.type === 'Receta emitida');
            if (prescriptions.length > 0) {
                hasEntries = true;
                html += `<h5>${patient.fullName || patient.name}</h5>`;
                prescriptions.forEach(p => {
                    const data = p.data;
                    const meds = data.medications.map(m => m.name).join(', ');
                    html += `<ul style="font-size: 0.9em;">
                                <li><strong>Medicamentos:</strong> ${meds}</li>
                                <li><strong>Recomendaciones:</strong> ${data.recommendations || 'Ninguna'}</li>
                             </ul>`;
                });
            }
        });
        
        if (!hasEntries) {
            html += '<p>No se encontraron recetas emitidas.</p>';
        }
        displayReport('Reporte de Recetas por Paciente', html);
    });
}

  function initConfigPage() {
    const uploadInput = $('signatureUpload');
    const saveBtn = $('saveSignatureBtn');
    const deleteBtn = $('deleteSignatureBtn');
    const preview = $('signaturePreview');
    const previewContainer = $('signaturePreviewContainer');
    
    if (!uploadInput) return;
    
    let currentSignature = localStorage.getItem(SIGNATURE_KEY);
    if (currentSignature) {
        preview.src = currentSignature;
        previewContainer.style.display = 'block';
    }
    
    uploadInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            preview.src = event.target.result;
            previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    saveBtn.addEventListener('click', () => {
        if (preview.src && !preview.src.endsWith(window.location.pathname)) {
            saveSignatureImage(preview.src);
            showMessage('Firma guardada con éxito.', 'success');
        } else {
            showMessage('No hay ninguna firma para guardar.', 'warning');
        }
    });

    deleteBtn.addEventListener('click', () => {
        saveSignatureImage(null);
        preview.src = '';
        previewContainer.style.display = 'none';
        uploadInput.value = '';
        showMessage('Firma eliminada.', 'info');
    });
}

function initStudyPage() {
    const form = $('studyForm');
    if (!form) return;

    const params = new URL(window.location.href).searchParams;
    let patientIdParam = params.get('pid');
    const editHistoryId = params.get('edit_hid');

    const patientSelect = $('patientSelect');
    const imageInput = $('studyImages');
    const previewsContainer = $('imagePreviews');
    let imageFiles = []; // Almacena los nuevos archivos
    let existingImages = []; // Almacena imágenes (Base64) ya guardadas

    const db = loadDB();
    patientSelect.innerHTML = '<option value="">Seleccione un paciente</option>';
    db.patients.sort((a,b) => (a.fullName || a.name).localeCompare(b.fullName || b.name)).forEach(p => {
    patientSelect.innerHTML += `<option value="${p.id}">${p.fullName || p.name}</option>`;
    });

    const renderPreviews = () => {
        previewsContainer.innerHTML = '';
        existingImages.forEach((imgData, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.style = "position: relative; display: inline-block;";
            imgContainer.innerHTML = `
                <img src="${imgData}" style="max-width: 100px; max-height: 100px; border-radius: 4px; margin: 5px;" />
                <button type="button" class="btn danger" data-index="${index}" style="position: absolute; top: 0; right: 0; padding: 2px 5px; font-size: 10px;">X</button>
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

    imageInput.addEventListener('change', e => {
        const newFiles = Array.from(e.target.files);
        const totalImages = existingImages.length + newFiles.length;

        if (totalImages > 4) {
            showMessage('Solo puedes tener un máximo de 4 imágenes por estudio.', 'warning');
            imageInput.value = ''; // Limpiar el input
            return;
        }
        
        imageFiles = newFiles; // Almacena solo los *nuevos* archivos a procesar

        // Renderizar vistas previas de nuevos archivos temporalmente
        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = document.createElement('img');
                img.src = event.target.result;
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.borderRadius = '4px';
                img.style.margin = '5px';
                img.style.opacity = '0.5'; // Indicar que es nuevo
                previewsContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
    
    // MODO EDICIÓN
    if (editHistoryId && patientIdParam) {
        document.title = "Editar Estudio Médico";
        const history = db.histories[patientIdParam] || [];
        const historyEvent = history.find(h => h.id === editHistoryId);
        
        if (historyEvent && historyEvent.type === 'Estudio Médico') {
            const data = historyEvent.data;
            patientSelect.value = patientIdParam;
            patientSelect.disabled = true;
            $('studyDate').value = data.date || '';
            $('studyType').value = data.type || '';
            $('bodyPart').value = data.bodyPart || '';
            $('studyFindings').value = data.findings || '';
            existingImages = [...(data.images || [])]; // Cargar imágenes existentes
            renderPreviews();
        }
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const patientId = patientIdParam || patientSelect.value;
        if (!patientId) {
            showMessage('Por favor, selecciona un paciente.', 'warning');
            return;
        }

        // Convertir solo los *nuevos* archivos a Base64
        const newImagePromises = imageFiles.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = event => resolve(event.target.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        });

        const newImageBase64Strings = await Promise.all(newImagePromises);

        const allImages = [...existingImages, ...newImageBase64Strings]; // Combinar viejas y nuevas

        const studyData = {
            id: editHistoryId ? (db.histories[patientId].find(h => h.id === editHistoryId)?.data.id || randId('std')) : randId('std'),
            date: $('studyDate').value,
            type: $('studyType').value,
            bodyPart: $('bodyPart').value,
            findings: $('studyFindings').value,
            images: allImages,
            createdAt: nowISO()
        };

        const db_to_save = loadDB();
        db_to_save.histories[patientId] = db_to_save.histories[patientId] || [];
        
        if (editHistoryId) { // MODO ACTUALIZACIÓN
            const historyIndex = db_to_save.histories[patientId].findIndex(h => h.id === editHistoryId);
            if (historyIndex > -1) {
                db_to_save.histories[patientId][historyIndex].data = studyData;
                db_to_save.histories[patientId][historyIndex].timestamp = nowISO();
            }
        } else { // MODO CREACIÓN
            db_to_save.histories[patientId].push({
                id: randId('h'),
                timestamp: nowISO(),
                type: 'Estudio Médico',
                data: studyData
            });
        }
        saveDB(db_to_save);
        
        showMessage('Estudio Médico guardado en el historial.', 'success');

        if (!editHistoryId) {
            form.reset();
            previewsContainer.innerHTML = '';
        } else {
             setTimeout(() => {
                window.location.href = `paciente_full.html?pid=${patientId}`;
            }, 1000);
        }
    });
}

function initPaymentPage() {
    const form = $('paymentForm');
    if (!form) return;

    const params = new URL(window.location.href).searchParams;
    let patientIdParam = params.get('pid');
    const editHistoryId = params.get('edit_hid');

    if (editHistoryId && !patientIdParam) {
        const dbFind = loadDB();
        for (const pId in dbFind.histories) {
            if (dbFind.histories[pId].find(h => h.id === editHistoryId)) {
                patientIdParam = pId;
                break;
            }
        }
    }

    const patientSelect = $('patientSelect');
    const db = loadDB();
    patientSelect.innerHTML = '<option value="">Seleccione un paciente</option>';
    db.patients.sort((a, b) => (a.fullName || a.name).localeCompare(b.fullName || b.name)).forEach(p => {
        patientSelect.innerHTML += `<option value="${p.id}">${p.fullName || p.name}</option>`;
    });

    const paymentMethodSelect = $('paymentMethod');
    const otherContainer = $('paymentMethodOtherContainer');
    const otherInput = $('paymentMethodOther');
    
    // --- NUEVO: Lógica de facturación ---
    const facturacionContainer = $('facturacionContainer');
    const facturadoCheckbox = $('paymentFacturado');
    const facturaEmitidaContainer = $('facturaEmitidaContainer');
    const facturaEmitidaCheckbox = $('paymentFacturaEmitida');

    const toggleFacturacion = () => {
        if (paymentMethodSelect.value === 'Efectivo') {
            facturacionContainer.style.display = 'none';
            facturadoCheckbox.checked = false;
            facturaEmitidaCheckbox.checked = false;
        } else {
            facturacionContainer.style.display = 'block';
        }
    };
    
    const toggleFacturaEmitida = () => {
        facturaEmitidaContainer.style.display = facturadoCheckbox.checked ? 'block' : 'none';
        if (!facturadoCheckbox.checked) {
            facturaEmitidaCheckbox.checked = false;
        }
    };

    paymentMethodSelect.addEventListener('change', () => {
        if (paymentMethodSelect.value === 'Otro') {
            otherContainer.style.display = 'block';
        } else {
            otherContainer.style.display = 'none';
            otherInput.value = '';
        }
        toggleFacturacion();
        toggleFacturaEmitida();
    });
    
    facturadoCheckbox.addEventListener('change', toggleFacturaEmitida);
    // --- FIN: Lógica de facturación ---
    
    // MODO EDICIÓN
    if (editHistoryId && patientIdParam) {
        document.title = "Editar Registro de Pago";
        const history = db.histories[patientIdParam] || [];
        const historyEvent = history.find(h => h.id === editHistoryId);
        
        if (historyEvent && historyEvent.type === 'Registro de Pago') {
            const data = historyEvent.data;
            patientSelect.value = patientIdParam;
            patientSelect.disabled = true;
            $('paymentConcept').value = data.concept || 'Consulta de Traumatología';
            $('paymentAmount').value = data.amount || '';
            
            const standardMethods = ['Efectivo', 'Transferencia Bancaria', 'Tarjeta de Crédito/Débito'];
            if (standardMethods.includes(data.method)) {
                paymentMethodSelect.value = data.method;
            } else {
                paymentMethodSelect.value = 'Otro';
                otherInput.value = data.method;
            }
            
            // Cargar estado de facturación
            facturadoCheckbox.checked = data.facturado || false;
            facturaEmitidaCheckbox.checked = data.facturaEmitida || false;
            
            toggleOtherMethod();
            toggleFacturacion();
            toggleFacturaEmitida();
        }
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const patientId = patientIdParam || patientSelect.value;
        if (!patientId) {
            showMessage('Por favor, selecciona un paciente.', 'warning');
            return;
        }
        const patient = db.patients.find(p => p.id === patientId);

        let paymentMethodValue = paymentMethodSelect.value;
        if (paymentMethodValue === 'Otro') {
            const otherValue = otherInput.value.trim();
            if (otherValue) {
                paymentMethodValue = otherValue;
            }
        }

        const paymentData = {
            id: editHistoryId ? (db.histories[patientId].find(h => h.id === editHistoryId)?.data.id || randId('pay')) : randId('pay'),
            concept: $('paymentConcept').value,
            method: paymentMethodValue,
            amount: $('paymentAmount').value,
            facturado: facturadoCheckbox.checked,
            facturaEmitida: facturaEmitidaCheckbox.checked,
            createdAt: nowISO()
        };

        const db_to_save = loadDB();
        db_to_save.histories[patientId] = db_to_save.histories[patientId] || [];
        
        if (editHistoryId) { // MODO ACTUALIZACIÓN
            const historyIndex = db_to_save.histories[patientId].findIndex(h => h.id === editHistoryId);
            if (historyIndex > -1) {
                db_to_save.histories[patientId][historyIndex].data = paymentData;
                db_to_save.histories[patientId][historyIndex].timestamp = nowISO();
            }
        } else { // MODO CREACIÓN
            db_to_save.histories[patientId].push({
                id: randId('h'),
                timestamp: nowISO(),
                type: 'Registro de Pago',
                data: paymentData
            });
        }
        
        saveDB(db_to_save);
        showMessage('Pago registrado y recibo listo para imprimir.', 'success');
        generatePaymentPrintWindow(patient, paymentData);

        if (!editHistoryId) {
            form.reset();
            patientSelect.value = '';
            toggleOtherMethod();
            toggleFacturacion();
            toggleFacturaEmitida();
        } else {
             setTimeout(() => {
                window.location.href = `paciente_full.html?pid=${patientId}`;
            }, 1000);
        }
    });
}

function initDiagnosisPage() {
    const form = $('diagnosisForm');
    if (!form) return;

    const params = new URL(window.location.href).searchParams;
    let patientIdParam = params.get('pid');
    const editHistoryId = params.get('edit_hid');

    const patientSelect = $('patientSelect');
    const db = loadDB();
    db.patients.sort((a,b) => (a.fullName || a.name).localeCompare(b.fullName || b.name)).forEach(p => {
    patientSelect.innerHTML += `<option value="${p.id}">${p.fullName || p.name}</option>`;
    });

    // MODO EDICIÓN
    if (editHistoryId && patientIdParam) {
        document.title = "Editar Diagnóstico";
        const history = db.histories[patientIdParam] || [];
        const historyEvent = history.find(h => h.id === editHistoryId);
        
        if (historyEvent && historyEvent.type === 'Diagnóstico') {
            const data = historyEvent.data;
            patientSelect.value = patientIdParam;
            patientSelect.disabled = true;
            $('diagnosisTitle').value = data.title || '';
            $('diagnosisDescription').value = data.description || '';
        }
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const patientId = patientIdParam || patientSelect.value;
        if (!patientId) {
            showMessage('Por favor, selecciona un paciente.', 'warning');
            return;
        }
        const patient = db.patients.find(p => p.id === patientId);

        const diagnosisData = {
            id: editHistoryId ? (db.histories[patientId].find(h => h.id === editHistoryId)?.data.id || randId('diag')) : randId('diag'),
            title: $('diagnosisTitle').value,
            description: $('diagnosisDescription').value,
            createdAt: nowISO()
        };

        const db_to_save = loadDB();
        db_to_save.histories[patientId] = db_to_save.histories[patientId] || [];
        
        if (editHistoryId) { // MODO ACTUALIZACIÓN
            const historyIndex = db_to_save.histories[patientId].findIndex(h => h.id === editHistoryId);
            if (historyIndex > -1) {
                db_to_save.histories[patientId][historyIndex].data = diagnosisData;
                db_to_save.histories[patientId][historyIndex].timestamp = nowISO();
            }
        } else { // MODO CREACIÓN
            db_to_save.histories[patientId].push({
                id: randId('h'),
                timestamp: nowISO(),
                type: 'Diagnóstico',
                data: diagnosisData
            });
        }
        saveDB(db_to_save);
        
        showMessage('Diagnóstico guardado y listo para imprimir.', 'success');
        generateDiagnosisPrintWindow(patient, diagnosisData);

        if (!editHistoryId) {
            form.reset();
        } else {
             setTimeout(() => {
                window.location.href = `paciente_full.html?pid=${patientId}`;
            }, 1000);
        }
    });
}

function initParteMedicoPage() {
    const form = $('parteMedicoForm');
    if (!form) return;
    
    const params = new URL(window.location.href).searchParams;
    const patientId = params.get('pid');
    const editHistoryId = params.get('edit_hid');
    
    if (!patientId) {
        form.innerHTML = '<h2>Paciente no especificado</h2>';
        return;
    }
    
    const db = loadDB();
    const patient = db.patients.find(p => p.id === patientId);
    
    if (!patient) {
        form.innerHTML = '<h2>Paciente no encontrado</h2>';
        return;
    }

    const patientNameEl = $('patientNameForParte');
    if(patientNameEl) patientNameEl.textContent = patient.name;
    
    // MODO EDICIÓN: Cargar datos existentes
    if (editHistoryId) {
        document.title = "Editar Parte Médico";
        const history = db.histories[patientId] || [];
        const historyEvent = history.find(h => h.id === editHistoryId);
        if (historyEvent && historyEvent.type === 'Parte Médico') {
            $('parteAnalisis').value = historyEvent.data.analysis || '';
        }
    }

    form.addEventListener('submit', e => {
        e.preventDefault();
        const parteData = {
            id: editHistoryId ? (db.histories[patientId].find(h => h.id === editHistoryId)?.data.id || randId('pm')) : randId('pm'),
            analysis: $('parteAnalisis').value,
            createdAt: nowISO()
        };

        const db_to_save = loadDB();
        db_to_save.histories[patientId] = db_to_save.histories[patientId] || [];
        
        if (editHistoryId) { // MODO ACTUALIZACIÓN
            const historyIndex = db_to_save.histories[patientId].findIndex(h => h.id === editHistoryId);
            if (historyIndex > -1) {
                db_to_save.histories[patientId][historyIndex].data = parteData;
                db_to_save.histories[patientId][historyIndex].timestamp = nowISO();
            }
        } else { // MODO CREACIÓN
            db_to_save.histories[patientId].push({
                id: randId('h'),
                timestamp: nowISO(),
                type: 'Parte Médico',
                data: parteData
            });
        }
        
        saveDB(db_to_save);
        showMessage('Parte Médico guardado.', 'success');
        generateParteMedicoPrintWindow(patient, parteData);
        
        if (!editHistoryId) {
            form.reset();
        } else {
             setTimeout(() => {
                window.location.href = `paciente_full.html?pid=${patientId}`;
            }, 1000);
        }
    });
}

// ---------- FUNCIONES DE IMPRESIÓN (ACTUALIZADAS) ----------
  function getPrintHeader() {
    const now = new Date();
    const logoUrl = 'Logo.jfif'; // Asegúrate que Logo.jpg esté en la misma carpeta

    return `
      <div class="print-header">
        <div class="logo-col">
           <img src="${logoUrl}" alt="Logo" class="logo-img"> 
        </div>
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
      </div>
    `;
  }

  function getPrintFooter() {
      const signatureImage = localStorage.getItem(SIGNATURE_KEY);
      const signatureContent = signatureImage 
        ? `<img src="${signatureImage}" alt="Firma Digital" class="signature-img">`
        : `<div class="signature-line"></div>`;

      return `
        <div class="print-footer">
            ${signatureContent}
            <p>DR. JUAN GÓMEZ OJEDA</p>
        </div>
      `;
  }

  function openPrintPreview(title, content) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
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
          <div class="controls">
            <button onclick="window.print()">Imprimir</button>
          </div>
          <div class="page-container">
            ${content}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function generatePrintWindow(patient, medications, recommendations) {
    const header = getPrintHeader();
    const footer = getPrintFooter();
    const patientName = patient.fullName || patient.name;
    const patientAge = patient.age || calculateAge(patient.birthdate);
    const patientData = `
        <div class="patient-data">
            <span><strong>Paciente:</strong> ${patientName}</span>
            <span><strong>Edad:</strong> ${patientAge}</span>
            <span><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</span>
        </div>`;

    let medsHtml = medications.map((med, index) => `
      <div class="med-item">
        <h4>${index + 1}. ${med.name} ${med.dose ? `(${med.dose}, ${med.form})` : ''}</h4>
        <p><strong>Indicaciones:</strong> Tomar ${med.freq}, por ${med.dur}.</p>
        ${med.instr ? `<p><em>${med.instr}</em></p>` : ''}
      </div>
    `).join('');
    
    const recommendationsHtml = recommendations 
        ? `<h3 class="section-title">Recomendaciones Adicionales</h3><p>${recommendations.replace(/\n/g, '<br>')}</p>` 
        : '';
    
    const content = header + patientData + `<h3 class="section-title">Tratamiento</h3>` + medsHtml + recommendationsHtml + footer;
    openPrintPreview(`Receta Médica - ${patientName}`, content);
  }

  function generateHistoryPrintWindow(patient, history) {
    const header = getPrintHeader();
    const footer = getPrintFooter();
    const esc = (s='') => String(s||'');
    const patientName = patient.fullName || patient.name;
    const patientAge = patient.age || calculateAge(patient.birthdate);

    let surgeriesHtml = 'No reportadas';
    if (Array.isArray(patient.surgeries) && patient.surgeries.length > 0) {
        surgeriesHtml = '<ul>' + patient.surgeries.map(s => 
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
            case 'Cita agendada': case 'Cita eliminada': case 'Cita finalizada': content = `Fecha: ${data.date}, Hora: ${data.time}`; break;
            case 'Reagenda': content = `Cita movida de ${data.oldDate} ${data.oldTime} para ${data.newDate} ${data.newTime}.`; break;
            case 'Reporte Médico': content = `<strong>${data.title}</strong>`; break;
            case 'Parte Médico': content = `Análisis: ${data.analysis.substring(0, 50)}...`; break;
            case 'Diagnóstico': content = data.title; break;
            case 'Estudio Médico': content = `${data.type} de ${data.bodyPart}`; break;
            case 'Registro de Pago': content = `Monto: $${data.amount} (${data.method})`; break;
            default: return '';
        }
        return `<span>${content}</span>`;
    };

    const historyHtml = history.length 
        ? '<ul>' + history.map(h => {
            const titleText = h.data.title || h.data.type || h.type;
            return `<li style="margin-bottom: 10px;"><strong>${esc(titleText)}</strong> <span style="font-size: 0.8em; color: #555;">(${new Date(h.timestamp).toLocaleString('es-ES')})</span><br/>${formatHistoryDataForPrint(h)}</li>`
        }).join('') + '</ul>'
        : '<p>No hay historial de actividad.</p>';

    const mainContent = `
        <div class="patient-data">
            <span><strong>Paciente:</strong> ${patientName}</span>
        </div>
        <div>
            <h3 class="section-title">Datos Personales</h3>
            <div class="grid">
                <div><strong>Edad:</strong> ${esc(patientAge || '—')}</div>
                <div><strong>Sexo:</strong> ${esc(patient.sex || '—')}</div>
                <div><strong>Teléfono:</strong> ${esc(patient.phone || '—')}</div>
                <div><strong>RFC:</strong> ${esc(patient.rfc || '—')}</div>
            </div>
        </div>
        <div>
            <h3 class="section-title">Antecedentes Médicos</h3>
            <p><strong>Alergias:</strong> ${(patient.allergies && patient.allergies.length) ? esc(patient.allergies.join(', ')) : '—'}</p>
            <p><strong>Enfermedades Crónicas:</strong> ${(patient.chronic && patient.chronic.length) ? esc(patient.chronic.join(', ')) : '—'}</p>
            <div><strong>Cirugías Previas:</strong> ${surgeriesHtml}</div>
        </div>
        <div>
            <h3 class="section-title">Historial de Actividad</h3>
            ${historyHtml}
        </div>
    `;

    const fullContent = header + mainContent + footer;
    openPrintPreview(`Historial Médico - ${patientName}`, fullContent);
  }

  function generateReportPrintWindow(patient, reportData) {
    const header = getPrintHeader();
    const footer = getPrintFooter();
    const esc = (s = '') => String(s || '').replace(/\n/g, '<br>');
    const patientName = patient.fullName || patient.name;
    
    // Lógica para reportes dinámicos
    let sectionsHtml = '';
    if (reportData.sections && Array.isArray(reportData.sections)) {
         sectionsHtml = reportData.sections
            .map(section => `<h4>${esc(section.title)}</h4><p>${esc(section.content)}</p>`)
            .join('');
    }

    const mainContent = `
        <div class="patient-data">
             <span><strong>Paciente:</strong> ${patientName}</span>
        </div>
        <div>
            <h3 class="section-title">${esc(reportData.title)}</h3>
            ${sectionsHtml}
        </div>
    `;

    const fullContent = header + mainContent + footer;
    openPrintPreview(`Reporte Médico - ${patientName}`, fullContent);
  }
  
  function generateDiagnosisPrintWindow(patient, diagnosisData) {
    const header = getPrintHeader();
    const footer = getPrintFooter();
    const patientName = patient.fullName || patient.name;
    const esc = (s = '') => String(s || '').replace(/\n/g, '<br>');
    const mainContent = `
        <div class="patient-data">
             <span><strong>Paciente:</strong> ${patientName}</span>
        </div>
        <div>
            <h3 class="section-title">Diagnóstico Médico</h3>
            <h4>${esc(diagnosisData.title)}</h4>
            <p>${esc(diagnosisData.description)}</p>
        </div>
    `;
    const fullContent = header + mainContent + footer;
    openPrintPreview(`Diagnóstico - ${patientName}`, fullContent);
  }

  function generateStudyPrintWindow(patient, studyData) {
    const header = getPrintHeader();
    const footer = getPrintFooter();
    const patientName = patient.fullName || patient.name;
    const esc = (s = '') => String(s || '').replace(/\n/g, '<br>');
    const imagesHtml = (studyData.images || []).map(imgData => `<img src="${imgData}" style="max-width: 100%; margin-bottom: 1rem; border-radius: 4px;" />`).join('');

    const mainContent = `
        <div class="patient-data">
             <span><strong>Paciente:</strong> ${patientName}</span>
        </div>
        <div>
            <h3 class="section-title">Estudio Médico</h3>
            <p><strong>Tipo de Estudio:</strong> ${esc(studyData.type)}</p>
            <p><strong>Parte del Cuerpo:</strong> ${esc(studyData.bodyPart)}</p>
            <p><strong>Fecha del Estudio:</strong> ${esc(studyData.date)}</p>
            <h4>Hallazgos</h4>
            <p>${esc(studyData.findings)}</p>
            <h3 class="section-title">Imágenes Adjuntas</h3>
            <div class="study-images">${imagesHtml}</div>
        </div>
    `;
    const fullContent = header + mainContent + footer;
    openPrintPreview(`Estudio - ${patientName}`, fullContent);
  }
  
  function generateParteMedicoPrintWindow(patient, parteData) {
    const header = getPrintHeader();
    const footer = getPrintFooter();
    const patientName = patient.fullName || patient.name;
    const esc = (s = '') => String(s || '').replace(/\n/g, '<br>');
    const mainContent = `
        <div class="patient-data">
             <span><strong>Paciente:</strong> ${patientName}</span>
        </div>
        <div>
            <h3 class="section-title">Parte Médico</h3>
            <p>${esc(parteData.analysis)}</p>
        </div>
    `;
    const fullContent = header + mainContent + footer;
    openPrintPreview(`Parte Médico - ${patientName}`, fullContent);
  }
  
  function generatePaymentPrintWindow(patient, paymentData) {
    const header = getPrintHeader();
    const footer = getPrintFooter();
    const patientName = patient.fullName || patient.name;
    const esc = (s = '') => String(s || '');
    const mainContent = `
        <div class="patient-data">
             <span><strong>Paciente:</strong> ${patientName}</span>
        </div>
        <div>
            <h3 class="section-title">Recibo de Pago</h3>
            <p><strong>Concepto:</strong> ${esc(paymentData.concept)}</p>
            <p><strong>Monto Pagado:</strong> $${Number(paymentData.amount).toFixed(2)} MXN</p>
            <p><strong>Método de Pago:</strong> ${esc(paymentData.method)}</p>
            <p><strong>Fecha de Pago:</strong> ${new Date(paymentData.createdAt).toLocaleDateString('es-ES', { dateStyle: 'full' })}</p>
        </div>
    `;
    const fullContent = header + mainContent + footer;
    openPrintPreview(`Recibo de Pago - ${patientName}`, fullContent);
  }

  // ---------- INICIALIZADOR PRINCIPAL ----------
  document.addEventListener('DOMContentLoaded', () => {
    initPatientForm();
    initCalendarModule();
    initHistoryPage();
    initPatientDetailPage();
    initRecetaPage();
    initReportPage();
    initParteMedicoPage();
    initConfigPage();
    initStudyPage();
    initDiagnosisPage();
    initPaymentPage();
  });
})();