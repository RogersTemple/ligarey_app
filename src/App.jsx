import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut, AlertCircle, Bell, BellOff, Settings, Eraser, UserX, RefreshCcw, Eye, EyeOff, MapPin, Mic, Globe
} from 'lucide-react';

// --- CONFIGURACIÓN FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut, 
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  onSnapshot,
  query
} from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyCCPXwU33jrYr5nRVyTnQGWeCY_6W-FmXc",
  authDomain: "ligarey.firebaseapp.com",
  projectId: "ligarey",
  storageBucket: "ligarey.firebasestorage.app",
  messagingSenderId: "625102595981",
  appId: "1:625102595981:web:baf09f9cda0d1b3b19ffc4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ligarey-v4';

// --- CONSTANTES ---
const INTERESES_COMUNES = [
  "Rock", "Pop", "Indie", "Reggaetón", "Electrónica", "Trap", "Metal",
  "Cerveza", "Cócteles", "Vino", "Bailar", "Pogo", "Primera fila",
  "VIP", "Acampada", "Post-concierto", "Hacer fotos", "Charlas",
  "Conocer gente", "Viajar", "Festivales", "Tatuajes", "Moda", "Deporte"
];

const PAISES = [
  "España", "Italia", "Francia", "Alemania", "Reino Unido", "Portugal", 
  "EE.UU.", "México", "Argentina", "Colombia", "Chile", "Perú", "Otro"
];

const IDIOMAS = [
  "Español", "Inglés", "Italiano", "Francés", "Alemán", "Portugués", "Otro"
];

const PERFILES_MOCK = [
  { id: 'm1', name: 'Lucía (Ejemplo)', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop', phrase: 'Viviendo el momento ✨', lookingFor: 'Gente para el escenario principal', interests: ['Rock', 'Cerveza fría'], pais: 'España', idiomas: ['Español', 'Inglés'] },
  { id: 'm2', name: 'Carlos (Ejemplo)', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop', phrase: 'Rock & Roll en vena 🤘', lookingFor: 'Compañero de pogos', interests: ['Metal', 'Pogo'], pais: 'Argentina', idiomas: ['Español'] }
];

// --- DICCIONARIO DE TRADUCCIONES ---
const T = {
  es: {
    app_desc: "La app oficial del festival", btn_create_free: "Crear cuenta gratis", btn_already_have: "Ya tengo cuenta",
    auth_hi: "Hola", auth_reg: "Regístrate", email: "Email", pass: "Contraseña", show: "Ver", hide: "Ocultar",
    terms_priv: "He leído y acepto la Política de Privacidad y el tratamiento de mis datos.",
    terms_cond: "Me comprometo a estar abierto a conocer gente con respeto, educación y buen rollo.",
    terms_news: "Acepto recibir correos informativos sobre novedades y eventos.",
    btn_enter: "ENTRAR", btn_create_vip: "CREAR CUENTA VIP", no_account: "¿No tienes cuenta? Regístrate", yes_account: "¿Ya tienes cuenta? Entra",
    prof_title: "Mi Perfil VIP", tab_data: "DATOS", tab_preview: "PREVIA",
    name_req: "Tu nombre (Obligatorio)", nation: "Nación de origen...", spoken_lang: "Idioma que hablas...",
    app_language: "Idioma de la App", phrase_req: "Frase favorita (Obligatorio)", looking_req: "ESTOY BUSCANDO: (Obligatorio)",
    save_changes: "Guardar Cambios", logout: "Cerrar Sesión", to_pista: "¡A LA PISTA!",
    passed: "PASADO", sent: "ENVIADO", in_chat: "YA EN CHAT", looking_for: "Busco:", nobody_new: "Nadie nuevo por la pista...",
    refresh: "Refrescar radar", my_chats: "Mis Chats", chat_open: "Chat abierto", no_chats: "Aún no tienes chats",
    view_vip: "Ver ficha VIP", write: "Escribe...", activity: "Actividad", clear: "Limpiar",
    wrote_you: "te escribió", greeted_you: "te saludó", empty_history: "Historial vacío",
    settings: "Ajustes VIP", notifications: "Notificaciones", notif_desc: "Avisos y mensajes",
    del_account: "Borrar mi Cuenta", del_title: "¿Eliminar cuenta?", del_desc: "Tu cuenta desaparecerá para siempre.",
    yes_del: "SÍ, ELIMINAR", cancel: "CANCELAR", qr_title: "Descuento Rey", qr_desc: "Muestra en barra principal", qr_explanation: "Presenta este código QR en la barra principal para obtener 1€ de descuento en cada una de tus bebidas toda la noche.",
    toast_vip: "Aviso VIP", close_tab: "Cerrar Ficha", loading: "CARGANDO...", unknown: "Desconocido",
    err_name: "El nombre es obligatorio.", err_photo: "Debes subir una foto de perfil.",
    err_nation: "Selecciona tu país de origen.", err_spoken: "Selecciona al menos un idioma.",
    err_phrase: "Escribe tu frase favorita.", err_looking: "Dinos qué buscas en el festival.",
    err_terms: "Debes aceptar la privacidad y normas de conducta para registrarte.",
    err_auth_in_use: "Este email ya está en uso.", err_auth_weak: "La contraseña debe tener al menos 6 caracteres.",
    err_auth_default: "Error: Revisa tus datos o si el email existe.",
    msg_saved: "¡Perfil guardado!", err_save: "Error al guardar. La foto puede ser muy grande."
  },
  en: {
    app_desc: "The official festival app", btn_create_free: "Create free account", btn_already_have: "I already have an account",
    auth_hi: "Hello", auth_reg: "Sign Up", email: "Email", pass: "Password", show: "Show", hide: "Hide",
    terms_priv: "I have read and accept the Privacy Policy and data processing.",
    terms_cond: "I commit to meeting people with respect, politeness, and good vibes.",
    terms_news: "I agree to receive informative emails about news and events.",
    btn_enter: "LOG IN", btn_create_vip: "CREATE VIP ACCOUNT", no_account: "Don't have an account? Sign Up", yes_account: "Already have an account? Log In",
    prof_title: "My VIP Profile", tab_data: "DATA", tab_preview: "PREVIEW",
    name_req: "Your name (Required)", nation: "Country of origin...", spoken_lang: "Language you speak...",
    app_language: "App UI Language", phrase_req: "Favorite phrase (Required)", looking_req: "I'M LOOKING FOR: (Required)",
    save_changes: "Save Changes", logout: "Log Out", to_pista: "TO THE DANCEFLOOR!",
    passed: "PASSED", sent: "SENT", in_chat: "IN CHAT", looking_for: "Looking for:", nobody_new: "Nobody new around...",
    refresh: "Refresh radar", my_chats: "My Chats", chat_open: "Chat open", no_chats: "You don't have any chats yet",
    view_vip: "View VIP Card", write: "Type...", activity: "Activity", clear: "Clear",
    wrote_you: "wrote to you", greeted_you: "greeted you", empty_history: "Empty history",
    settings: "VIP Settings", notifications: "Notifications", notif_desc: "Alerts and messages",
    del_account: "Delete my Account", del_title: "Delete account?", del_desc: "Your account will disappear forever.",
    yes_del: "YES, DELETE", cancel: "CANCEL", qr_title: "King Discount", qr_desc: "Show at the main bar", qr_explanation: "Show this QR code at the main bar to get €1 off every drink all night long.",
    toast_vip: "VIP Alert", close_tab: "Close Card", loading: "LOADING...", unknown: "Unknown",
    err_name: "Name is required.", err_photo: "You must upload a profile photo.",
    err_nation: "Select your country of origin.", err_spoken: "Select at least one language.",
    err_phrase: "Write your favorite phrase.", err_looking: "Tell us what you're looking for.",
    err_terms: "You must accept the privacy policy and rules to register.",
    err_auth_in_use: "This email is already in use.", err_auth_weak: "Password must be at least 6 characters.",
    err_auth_default: "Error: Check your data.",
    msg_saved: "Profile saved!", err_save: "Error saving. Photo might be too large."
  },
  it: {
    app_desc: "L'app ufficiale del festival", btn_create_free: "Crea account gratis", btn_already_have: "Ho già un account",
    auth_hi: "Ciao", auth_reg: "Registrati", email: "Email", pass: "Password", show: "Vedi", hide: "Nascondi",
    terms_priv: "Ho letto e accetto l'Informativa sulla Privacy e il trattamento dei dati.",
    terms_cond: "Mi impegno a conoscere persone con rispetto, educazione e buone vibrazioni.",
    terms_news: "Accetto di ricevere email informative su novità ed eventi.",
    btn_enter: "ENTRA", btn_create_vip: "CREA ACCOUNT VIP", no_account: "Non hai un account? Registrati", yes_account: "Hai già un account? Entra",
    prof_title: "Il mio Profilo VIP", tab_data: "DATI", tab_preview: "ANTEPRIMA",
    name_req: "Il tuo nome (Obbligatorio)", nation: "Nazione di origine...", spoken_lang: "Lingua che parli...",
    app_language: "Lingua dell'App", phrase_req: "Frase preferita (Obbligatorio)", looking_req: "STO CERCANDO: (Obbligatorio)",
    save_changes: "Salva Modifiche", logout: "Esci", to_pista: "ALLA PISTA!",
    passed: "SCARTATO", sent: "INVIATO", in_chat: "IN CHAT", looking_for: "Cerco:", nobody_new: "Nessuno di nuovo in pista...",
    refresh: "Aggiorna radar", my_chats: "Le mie Chat", chat_open: "Chat aperta", no_chats: "Non hai ancora chat",
    view_vip: "Vedi scheda VIP", write: "Scrivi...", activity: "Attività", clear: "Pulisci",
    wrote_you: "ti ha scritto", greeted_you: "ti ha salutato", empty_history: "Cronologia vuota",
    settings: "Impostazioni VIP", notifications: "Notifiche", notif_desc: "Avvisi e messaggi",
    del_account: "Elimina Account", del_title: "Eliminare account?", del_desc: "Il tuo account scomparirà per sempre.",
    yes_del: "SÌ, ELIMINA", cancel: "ANNULLA", qr_title: "Sconto Rey", qr_desc: "Mostra al bar principale", qr_explanation: "Mostra questo codice QR al bar principale per ottenere 1€ di sconto su ogni drink per tutta la notte.",
    toast_vip: "Avviso VIP", close_tab: "Chiudi Scheda", loading: "CARICAMENTO...", unknown: "Sconosciuto",
    err_name: "Il nome è obbligatorio.", err_photo: "Devi caricare una foto del profilo.",
    err_nation: "Seleziona la tua nazione.", err_spoken: "Seleziona almeno una lingua.",
    err_phrase: "Scrivi la tua frase preferita.", err_looking: "Dicci cosa cerchi nel festival.",
    err_terms: "Devi accettare privacy e regole per registrarti.",
    err_auth_in_use: "Questa email è già in uso.", err_auth_weak: "La password deve avere almeno 6 caratteri.",
    err_auth_default: "Errore: Controlla i tuoi dati.",
    msg_saved: "Profilo salvato!", err_save: "Errore durante il salvataggio. La foto potrebbe essere troppo grande."
  }
};

export default function App() {
  // Estados de la App
  const [view, setView] = useState('welcome');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  
  const [registerTerms, setRegisterTerms] = useState({ privacy: false, conduct: false, newsletter: false });
  const [user, setUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Perfil y Ajustes (Añadido appLanguage)
  const [myProfile, setMyProfile] = useState({ 
    name: '', photo: null, phrase: '', lookingFor: '', interests: [], 
    pais: '', idiomas: [], appLanguage: 'es', 
    notificationsEnabled: true 
  });
  
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 
  const [showSettings, setShowSettings] = useState(false); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [profiles, setProfiles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchAnimation, setShowMatchAnimation] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [profileMode, setProfileMode] = useState('edit');

  const [notifications, setNotifications] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [newNotificationToast, setNewNotificationToast] = useState(null);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [activeChatUser, setActiveChatUser] = useState(null); 
  const [showInspector, setShowInspector] = useState(null); 
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);

  // Refs de control
  const sessionStart = useRef(new Date().toISOString());
  const notifiedIds = useRef(new Set());
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null); 
  const typingTimeoutRef = useRef(null);

  // Rutas de Firestore
  const usersCol = collection(db, 'artifacts', appId, 'public', 'data', 'usuarios');
  const matchesCol = collection(db, 'artifacts', appId, 'public', 'data', 'matches');
  const chatsCol = collection(db, 'artifacts', appId, 'public', 'data', 'chats');
  const typingCol = collection(db, 'artifacts', appId, 'public', 'data', 'typing');

  // Traducción Dinámica
  const lang = myProfile?.appLanguage || 'es';
  const t = (key) => T[lang]?.[key] || T['es'][key] || key;

  // Auto-scroll en el chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, view, otherIsTyping]);

  // --- ARRANQUE Y AUTENTICACIÓN ---
  useEffect(() => {
    const initApp = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (e) { console.error("Auth error silent fail"); }
    };
    initApp();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const loadedIdiomas = data.idiomas || (data.idioma ? [data.idioma] : []);
            setMyProfile(prev => ({ ...prev, ...data, idiomas: loadedIdiomas }));
            
            // Bloqueo si el perfil es incompleto
            if (!data.name || !data.photo || !data.phrase || !data.lookingFor || !data.pais || loadedIdiomas.length === 0) {
              setView('register');
            } else if (view === 'welcome' || view === 'auth') {
              setView('discover');
            }
          } else {
            setView('register');
          }
        } catch (e) { setView('register'); }
      } else {
        setView('welcome');
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LISTENERS EN TIEMPO REAL ---
  useEffect(() => {
    if (!user) return;
    const unsubMatches = onSnapshot(matchesCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.to === user.uid) {
            setNotifications(prev => (prev.find(n => n.id === change.doc.id) ? prev : [{ id: change.doc.id, ...data, isMessage: false }, ...prev]));
            if (data.timestamp > sessionStart.current && !notifiedIds.current.has(change.doc.id)) {
              notifiedIds.current.add(change.doc.id);
              if (view !== 'notifications') setHasUnreadNotifs(true);
              if (myProfile.notificationsEnabled) {
                setNewNotificationToast({ id: change.doc.id, ...data, isMessage: false });
                showNativeNotification(t('toast_vip'), `${data.fromName} ${t('greeted_you')}`);
                setTimeout(() => setNewNotificationToast(null), 5000);
              }
            }
          }
        }
      });
    }, (err) => console.error("Snapshot error avoided"));

    const unsubChats = onSnapshot(chatsCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.to === user.uid && data.timestamp > sessionStart.current && !notifiedIds.current.has(change.doc.id)) {
            notifiedIds.current.add(change.doc.id);
            if (!activeChatUser || activeChatUser.id !== data.from) {
              if (view !== 'messages' && view !== 'chat') setHasUnreadMessages(true);
              if (myProfile.notificationsEnabled) {
                setNewNotificationToast({ id: change.doc.id, ...data, isMessage: true });
                showNativeNotification(t('toast_vip'), `${data.fromName}: ${data.text}`);
                setTimeout(() => setNewNotificationToast(null), 5000);
              }
            }
          }
        }
      });
    }, (err) => console.error("Snapshot error avoided"));

    return () => { unsubMatches(); unsubChats(); };
  }, [user, activeChatUser, myProfile.notificationsEnabled, view]);

  // --- CARGAR DATOS ---
  const fetchData = async () => {
    if (!user) return;
    try {
      const matchesSnap = await getDocs(matchesCol);
      const chatIds = [];
      matchesSnap.forEach(d => {
        const data = d.data();
        if (data.from === user.uid) chatIds.push({ id: data.to, name: data.toName });
        if (data.to === user.uid) chatIds.push({ id: data.from, name: data.fromName });
      });
      
      const uniqueIds = Array.from(new Map(chatIds.map(item => [item.id, item])).values());
      const enriched = await Promise.all(uniqueIds.map(async (c) => {
        const uDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', c.id));
        return uDoc.exists() ? { ...c, ...uDoc.data() } : c;
      }));
      setActiveChats(enriched);

      if (view === 'discover') {
        const usersSnap = await getDocs(usersCol);
        const matchedSet = new Set(uniqueIds.map(c => c.id));
        const list = [];
        usersSnap.forEach(d => { 
          if (d.id !== user.uid && d.data().name && d.data().photo) {
            const uData = d.data();
            const uIdiomas = uData.idiomas || (uData.idioma ? [uData.idioma] : []);
            list.push({ id: d.id, ...uData, idiomas: uIdiomas, isAlreadyMatched: matchedSet.has(d.id) }); 
          }
        });
        
        // Añadimos mocks solo si está muy vacío para no asustar
        setProfiles(list.length > 0 ? list : []);
      }
    } catch (e) { console.error("Fetch error avoided"); }
  };

  useEffect(() => {
    if (user && (view === 'discover' || view === 'messages')) { fetchData(); }
  }, [user, view]);

  // --- CHAT ACTIVO ---
  useEffect(() => {
    if (!user || !activeChatUser) return;
    const unsubChat = onSnapshot(chatsCol, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if ((d.from === user.uid && d.to === activeChatUser.id) || (d.from === activeChatUser.id && d.to === user.uid)) {
          msgs.push({ id: doc.id, ...d });
        }
      });
      msgs.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
      setChatMessages(msgs);
    });
    return () => unsubChat();
  }, [user, activeChatUser]);

  // --- ESCUCHAR SI EL OTRO ESCRIBE ---
  useEffect(() => {
    if (!user || !activeChatUser) {
      setOtherIsTyping(false);
      return;
    }
    const unsubTyping = onSnapshot(doc(typingCol, activeChatUser.id), (docSnap) => {
      if (docSnap.exists() && docSnap.data().typingTo === user.uid) {
        setOtherIsTyping(true);
      } else {
        setOtherIsTyping(false);
      }
    });
    return () => unsubTyping();
  }, [user, activeChatUser]);

  // --- FUNCIONES DE AUTH Y PERFIL ---
  const handleTypingChange = (e) => {
    setNewMessageText(e.target.value);
    if (!user || !activeChatUser) return;

    // Escribir en Firestore que estamos tecleando
    setDoc(doc(typingCol, user.uid), { typingTo: activeChatUser.id, timestamp: new Date().toISOString() });

    // Limpiar el estado de tecleando después de 2 segundos de inactividad
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(doc(typingCol, user.uid), { typingTo: null }, { merge: true });
    }, 2000);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (authMode === 'register') {
      if (!registerTerms.privacy || !registerTerms.conduct) {
        setAuthError(t('err_terms'));
        return;
      }
    }

    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        const res = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', res.user.uid), { 
          email: authForm.email, fechaRegistro: new Date().toISOString(), 
          notificationsEnabled: true, newsletterAccepted: registerTerms.newsletter,
          appLanguage: myProfile.appLanguage // Guardamos su idioma elegido
        });
        setView('register');
      }
    } catch (error) {
      if (error?.code === 'auth/email-already-in-use') setAuthError(t('err_auth_in_use'));
      else if (error?.code === 'auth/weak-password') setAuthError(t('err_auth_weak'));
      else setAuthError(t('err_auth_default'));
    } finally { setIsAuthLoading(false); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.85;
        let compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        while (compressedBase64.length > 800000 && quality > 0.3) {
          quality -= 0.1; compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        }
        setMyProfile({...myProfile, photo: compressedBase64});
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveProfileData = async () => {
    if (!user) return false;
    
    // Validación de campos
    if (!myProfile.name?.trim()) { setPhotoError(t('err_name')); return false; }
    if (!myProfile.photo) { setPhotoError(t('err_photo')); return false; }
    if (!myProfile.pais?.trim()) { setPhotoError(t('err_nation')); return false; }
    if (!myProfile.idiomas || myProfile.idiomas.length === 0) { setPhotoError(t('err_spoken')); return false; }
    if (!myProfile.phrase?.trim()) { setPhotoError(t('err_phrase')); return false; }
    if (!myProfile.lookingFor?.trim()) { setPhotoError(t('err_looking')); return false; }

    setIsSavingProfile(true);
    setPhotoError('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid), { ...myProfile }, { merge: true });
      setSaveMessage(t('msg_saved'));
      setTimeout(() => setSaveMessage(''), 2000);
      return true;
    } catch (e) { setPhotoError(t('err_save')); return false; }
    finally { setIsSavingProfile(false); }
  };

  const changeAppLanguage = async (newLang) => {
    setMyProfile({...myProfile, appLanguage: newLang});
    if (user) {
      try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid), { appLanguage: newLang }, { merge: true });
      } catch (e) { console.error(e) }
    }
  };

  const handleGoToPista = async () => {
    const ok = await saveProfileData();
    if (ok) setView('discover');
  };

  const deleteConversation = async (otherUserId) => {
    const snap = await getDocs(matchesCol);
    const delPromises = [];
    snap.forEach((document) => {
      const d = document.data();
      if ((d.from === user.uid && d.to === otherUserId) || (d.to === user.uid && d.from === otherUserId)) {
        delPromises.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'matches', document.id)));
      }
    });
    await Promise.all(delPromises);
    setActiveChatUser(null);
    setView('messages');
    fetchData();
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [], pais: '', idiomas: [], appLanguage: 'es', notificationsEnabled: true });
    setShowSettings(false);
    setView('welcome');
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid));
      await deleteUser(auth.currentUser);
      handleLogout();
    } catch (e) { 
      setShowDeleteConfirm(false);
      setShowSettings(false);
      setPhotoError('Por seguridad, cierra sesión y vuelve a entrar para poder borrar tu cuenta.'); 
    }
  };

  const toggleNotifications = async () => {
    const newVal = !myProfile.notificationsEnabled;
    setMyProfile({...myProfile, notificationsEnabled: newVal});
    if (user) {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid), { notificationsEnabled: newVal }, { merge: true });
    }
    
    // Pedir permiso al navegador/móvil si se activan
    if (newVal && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  };

  const handleMatchAction = async (type) => {
    if (showMatchAnimation) return;
    const target = profiles[currentIndex];
    if (!target) return;

    if (target.isAlreadyMatched && type !== 'dislike') {
        setActiveChatUser(target);
        setView('chat');
        return;
    }

    setShowMatchAnimation(type);
    if (type !== 'dislike' && user && !target.id.startsWith('m')) {
      await addDoc(matchesCol, { 
        from: user.uid, fromName: myProfile.name, to: target.id, toName: target.name, type: type, timestamp: new Date().toISOString() 
      });
    }
    setTimeout(() => { 
      setShowMatchAnimation(null); 
      setCurrentIndex(prev => (prev + 1) % (profiles.length || 1)); 
    }, type === 'dislike' ? 300 : 1500);
  };

  if (isInitializing) return <div className="min-h-[100dvh] bg-stone-900 flex flex-col items-center justify-center gap-4"><Crown className="w-16 h-16 text-rose-500 animate-pulse" /><p className="text-stone-400 font-black text-[10px] tracking-[0.2em] animate-pulse">{t('loading')}</p></div>;

  return (
    <div className="min-h-[100dvh] bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans overflow-hidden">
      
      {/* TOAST FLOTANTE */}
      {newNotificationToast && (
        <div onClick={() => { setActiveChatUser({ id: newNotificationToast.from, name: newNotificationToast.fromName }); setView('chat'); setNewNotificationToast(null); }} className="fixed top-6 left-1/2 -translate-x-1/2 z-[400] w-full max-w-[340px] px-4 animate-in slide-in-from-top cursor-pointer">
          <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${newNotificationToast.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>
              {newNotificationToast.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}
            </div>
            <div className="flex-1"><p className="text-[9px] font-black uppercase text-rose-400">{t('toast_vip')}</p><p className="text-xs font-bold truncate"><b>{newNotificationToast.fromName}</b> {newNotificationToast.isMessage ? t('wrote_you') : t('greeted_you')}</p></div>
          </div>
        </div>
      )}

      {/* INSPECTOR VIP */}
      {showInspector && (
        <div className="absolute inset-0 z-[500] bg-stone-900/95 backdrop-blur-xl animate-in slide-in-from-bottom flex flex-col p-6">
          <button onClick={() => setShowInspector(null)} className="self-end p-2 bg-white/10 rounded-full text-white mb-6"><X className="w-6 h-6" /></button>
          <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white">
            <img src={showInspector.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 p-8 text-white w-full">
              <h2 className="text-4xl font-black tracking-tighter mb-2 leading-none">{showInspector.name}</h2>
          <div className="flex items-center gap-3 mb-3 text-[10px] uppercase font-black tracking-widest text-rose-200">
            <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {showInspector.pais || t('unknown')}</div>
            <span className="opacity-40">•</span>
            <div className="flex items-center gap-1"><Mic className="w-3 h-3" /> {showInspector.idiomas?.join(', ') || t('unknown')}</div>
          </div>
          <p className="text-rose-300 font-bold mb-2 italic">"{showInspector.phrase || '¡Hola!'}"</p>
              <div className="bg-white/10 rounded-2xl p-4 mb-4"><p className="text-[10px] font-black uppercase mb-1 opacity-60">{t('looking_for')}</p><p className="text-sm font-medium">{showInspector.lookingFor}</p></div>
              <div className="flex flex-wrap gap-2">{(showInspector.interests || []).map((i, idx) => <span key={idx} className="px-3 py-1 bg-white/20 rounded-full text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
            </div>
          </div>
          <button onClick={() => setShowInspector(null)} className="w-full py-5 mt-6 rounded-full bg-rose-500 text-white font-black uppercase tracking-widest">{t('close_tab')}</button>
        </div>
      )}

      {/* MODAL AJUSTES Y SEGURIDAD */}
      {showSettings && (
        <div className="absolute inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full relative shadow-2xl animate-in zoom-in">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 transition-colors"><X className="w-6 h-6" /></button>
            <h3 className="text-2xl font-black text-stone-800 mb-6 tracking-tighter uppercase font-black">{t('settings')}</h3>
            
            <div className="space-y-4">
              {/* Idioma Interfaz */}
              <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-stone-400" />
                  <p className="font-bold text-stone-800 leading-none">{t('app_language')}</p>
                </div>
                <select value={myProfile.appLanguage} onChange={(e) => changeAppLanguage(e.target.value)} className="bg-white border border-stone-200 text-stone-700 text-xs font-bold rounded-lg p-2 outline-none">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                </select>
              </div>

              {/* Notificaciones */}
              <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div>
                  <p className="font-bold text-stone-800 leading-none mb-1">{t('notifications')}</p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest">{t('notif_desc')}</p>
                </div>
                <button onClick={toggleNotifications} className={`w-12 h-6 rounded-full transition-colors relative ${myProfile.notificationsEnabled ? 'bg-rose-500' : 'bg-stone-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${myProfile.notificationsEnabled ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <button onClick={handleLogout} className="w-full py-3 rounded-full bg-stone-100 text-stone-800 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <LogOut className="w-4 h-4" /> {t('logout')}
                </button>
                <button onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }} className="w-full py-3 rounded-full bg-red-50 text-red-500 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-100">
                  <Trash2 className="w-4 h-4" /> {t('del_account')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenedor principal de la app */}
      <div className="w-full max-w-md bg-white h-[100dvh] sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* CABECERA GENERAL */}
        {view !== 'welcome' && view !== 'auth' && view !== 'chat' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-rose-500" /><h1 className="text-xl font-black text-rose-500 tracking-tighter uppercase leading-none">LigaRey</h1></div>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="p-2 text-stone-400 hover:text-rose-500 transition-colors active:rotate-180"><RefreshCcw className="w-4 h-4" /></button>
              <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1"><QrCode className="w-3 h-3" /> {t('qr_title')}</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col">
          
          {/* BIENVENIDA */}
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 bg-stone-50 animate-in fade-in relative">
              {/* Selector de idioma pre-login */}
              <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full shadow-sm border border-stone-200">
                <select value={myProfile.appLanguage} onChange={e => changeAppLanguage(e.target.value)} className="bg-transparent text-stone-500 text-[10px] font-black uppercase outline-none">
                  <option value="es">ES</option>
                  <option value="en">EN</option>
                  <option value="it">IT</option>
                </select>
              </div>

              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce"><Crown className="text-white w-16 h-16" /></div>
              <h1 className="text-5xl font-black text-stone-900 tracking-tighter leading-none">LigaRey</h1>
              <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">{t('app_desc')}</p>
              <div className="w-full max-w-xs space-y-4 pt-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">{t('btn_create_free')}</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold uppercase tracking-widest text-xs active:scale-95 transition-all">{t('btn_already_have')}</button>
              </div>
            </div>
          )}

          {/* AUTENTICACIÓN */}
          {view === 'auth' && (
            <div className="h-full p-6 bg-stone-50 animate-in slide-in-from-right overflow-y-auto">
              <button onClick={() => setView('welcome')} className="p-2 text-stone-400 mb-6 active:scale-90 transition-transform"><ChevronLeft className="w-8 h-8" /></button>
              <h2 className="text-4xl font-black text-stone-900 mb-8 tracking-tighter uppercase">{authMode === 'login' ? t('auth_hi') : t('auth_reg')}</h2>
              {authError && <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> {authError}</p>}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input type="email" required placeholder={t('email')} value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors shadow-sm" />
                
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required placeholder={t('pass')} value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 pr-16 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors shadow-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 font-bold text-[10px] uppercase tracking-widest p-2">
                    {showPassword ? t('hide') : t('show')}
                  </button>
                </div>

                {authMode === 'register' && (
                  <div className="space-y-3 pt-2 pb-4 text-left">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={registerTerms.privacy} onChange={e => setRegisterTerms({...registerTerms, privacy: e.target.checked})} className="mt-1 w-4 h-4 accent-rose-500 shrink-0" />
                      <span className="text-[10px] text-stone-500 leading-tight">{t('terms_priv')} <span className="text-rose-500 font-bold">*</span></span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={registerTerms.conduct} onChange={e => setRegisterTerms({...registerTerms, conduct: e.target.checked})} className="mt-1 w-4 h-4 accent-rose-500 shrink-0" />
                      <span className="text-[10px] text-stone-500 leading-tight">{t('terms_cond')} <span className="text-rose-500 font-bold">*</span></span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={registerTerms.newsletter} onChange={e => setRegisterTerms({...registerTerms, newsletter: e.target.checked})} className="mt-1 w-4 h-4 accent-rose-500 shrink-0" />
                      <span className="text-[10px] text-stone-500 leading-tight">{t('terms_news')}</span>
                    </label>
                  </div>
                )}

                <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold h-14 shadow-lg active:scale-95 flex items-center justify-center transition-all mt-2">
                   {isAuthLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? t('btn_enter') : t('btn_create_vip'))}
                </button>
              </form>
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }} className="w-full mt-6 text-stone-500 text-xs font-bold uppercase tracking-widest leading-none">
                {authMode === 'login' ? t('no_account') : t('yes_account')}
              </button>
            </div>
          )}

          {/* PERFIL */}
          {view === 'register' && (
            <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black uppercase tracking-tighter">{t('prof_title')}</h2>
                <button onClick={() => setShowSettings(true)} className="p-2 bg-stone-200 rounded-full text-stone-600 hover:bg-stone-300 transition-colors active:scale-95 shadow-inner">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex justify-center mb-6 bg-stone-200 rounded-full p-1 shadow-inner shrink-0">
                <button onClick={() => setProfileMode('edit')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'edit' ? 'bg-white shadow text-stone-800' : 'text-stone-400'}`}>{t('tab_data')}</button>
                <button onClick={() => setProfileMode('preview')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'preview' ? 'bg-white shadow text-stone-800' : 'text-stone-400'}`}>{t('tab_preview')}</button>
              </div>
              
              {profileMode === 'edit' ? (
                <div className="space-y-6">
                  {photoError && <p className="text-red-500 text-[10px] font-bold text-center bg-red-50 p-2 rounded-lg border border-red-100">{photoError}</p>}
                  
                  {/* Foto */}
                  <div className="flex flex-col items-center">
                    <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-stone-800 shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-rose-400 transition-colors">
                      {myProfile.photo ? <img src={myProfile.photo} className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  </div>

                  <input type="text" placeholder={t('name_req')} value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm" />
                  
                  <div className="flex flex-col gap-4">
                    <select value={myProfile.pais} onChange={e => setMyProfile({...myProfile, pais: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm bg-white text-stone-600 text-sm">
                      <option value="">{t('nation')}</option>
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest px-2">{t('spoken_lang')}</p>
                      <div className="flex flex-wrap gap-2">
                        {IDIOMAS.map(lang => (
                          <button key={lang} type="button" onClick={() => {
                            const list = (myProfile.idiomas || []).includes(lang) 
                              ? myProfile.idiomas.filter(i => i !== lang) 
                              : [...(myProfile.idiomas || []), lang];
                            setMyProfile({...myProfile, idiomas: list});
                          }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${(myProfile.idiomas || []).includes(lang) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white text-stone-500 hover:bg-stone-50'}`}>{lang}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <input type="text" placeholder={t('phrase_req')} value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm italic" />
                  <textarea placeholder={t('looking_req')} value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none h-20 focus:border-rose-400 shadow-sm" />
                  
                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 10).map((int, idx) => (
                      <button key={idx} onClick={() => {
                        const list = (myProfile.interests || []).includes(int) ? myProfile.interests.filter(i => i !== int) : [...(myProfile.interests || []), int].slice(0, 5);
                        setMyProfile({...myProfile, interests: list});
                      }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${myProfile.interests?.includes(int) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>
                  <div className="pt-6">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs mb-3">{saveMessage}</p>}
                    <button onClick={saveProfileData} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">{t('save_changes')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200 animate-in fade-in">
                  {myProfile.photo && <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full">
                <h2 className="text-3xl font-black mb-1 leading-none">{myProfile.name || 'Sin nombre'}</h2>
                
                <div className="flex items-center gap-3 mb-3 text-[10px] uppercase font-black tracking-widest text-rose-200">
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {myProfile.pais || t('unknown')}</div>
                  <span className="opacity-40">•</span>
                  <div className="flex items-center gap-1"><Mic className="w-3 h-3" /> {myProfile.idiomas?.join(', ') || t('unknown')}</div>
                </div>

                <p className="text-rose-300 font-bold mb-1 italic leading-tight">"{myProfile.phrase}"</p>
                    <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mb-3 leading-none">{t('looking_for')} {myProfile.lookingFor}</p>
                    <div className="flex flex-wrap gap-2">{(myProfile.interests || []).map((i, idx) => <span key={idx} className="px-2 py-1 bg-white/20 rounded text-[9px] uppercase font-bold tracking-widest">{i}</span>)}</div>
                  </div>
                </div>
              )}
              <button onClick={handleGoToPista} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl uppercase h-16 active:scale-95 transition-all shrink-0">{t('to_pista')}</button>
            </div>
          )}

          {/* DISCOVER (LA PISTA) */}
          {view === 'discover' && (
            <div 
              className="h-full flex flex-col p-4 bg-rose-500 relative animate-in fade-in"
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cg transform='translate(10, 10) scale(1.2)'%3E%3Cpath d='m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Zm3 16h14'/%3E%3C/g%3E%3Cg transform='translate(45, 45) scale(1.2) rotate(20 12 12)'%3E%3Cpath d='m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Zm3 16h14'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
              }}
            >
              {showMatchAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md">
                  <div className="text-center animate-in zoom-in">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl mx-auto mb-4 border-4 border-stone-50">{showMatchAnimation === 'beer' && <Beer className="text-amber-500 fill-current w-12 h-12" />}{showMatchAnimation === 'hand' && <Hand className="text-green-500 fill-current w-12 h-12" />}{showMatchAnimation === 'dislike' && <X className="text-red-500 w-12 h-12" />}</div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">{showMatchAnimation === 'dislike' ? t('passed') : t('sent')}</h2>
                  </div>
                </div>
              )}
              
              <div className={`flex-1 min-h-0 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border-4 transition-all duration-500 ${profiles[currentIndex]?.isAlreadyMatched ? 'border-emerald-500 shadow-emerald-500/20' : 'border-stone-200'}`}>
                {profiles[currentIndex] ? (
                  <>
                    <img src={profiles[currentIndex]?.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
                    {profiles[currentIndex]?.isAlreadyMatched && (
                      <div className="absolute top-4 right-4 z-10 bg-emerald-500 text-white px-3 py-1.5 rounded-full font-black text-[10px] uppercase shadow-xl flex items-center gap-2">
                        <Check className="w-3 h-3" /> {t('in_chat')}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    <div className="absolute bottom-0 p-6 text-white w-full">
                      <div className="flex items-center gap-2 mb-1"><h2 className="text-4xl font-black tracking-tighter leading-none">{profiles[currentIndex]?.name}</h2>{profiles[currentIndex]?.isAlreadyMatched && <MessageCircle className="w-5 h-5 text-emerald-400" />}</div>
                  
                  <div className="flex items-center gap-3 mb-3 text-[10px] uppercase font-black tracking-widest text-rose-200">
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {profiles[currentIndex]?.pais || t('unknown')}</div>
                    <span className="opacity-40">•</span>
                    <div className="flex items-center gap-1"><Mic className="w-3 h-3" /> {profiles[currentIndex]?.idiomas?.join(', ') || t('unknown')}</div>
                  </div>

                  <p className="text-rose-300 font-bold mb-1 italic leading-tight">"{profiles[currentIndex]?.phrase}"</p>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-2 leading-none">{t('looking_for')} {profiles[currentIndex]?.lookingFor}</p>
                      <div className="flex flex-wrap gap-2">{(profiles[currentIndex]?.interests || []).map((i, idx) => <span key={idx} className="px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-stone-400 p-8 text-center gap-4 opacity-40">
                    <Sparkles className="w-12 h-12" />
                    <p className="font-bold italic">{t('nobody_new')}</p>
                    <button onClick={fetchData} className="text-rose-500 uppercase font-black text-xs border-b-2 border-rose-500 pb-1">{t('refresh')}</button>
                  </div>
                )}
              </div>
              <div className="flex justify-center items-center gap-4 py-4 shrink-0">
                <button onClick={() => handleMatchAction('beer')} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${profiles[currentIndex]?.isAlreadyMatched ? 'bg-emerald-500' : 'bg-amber-400'} text-white`}>{profiles[currentIndex]?.isAlreadyMatched ? <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" /> : <Beer className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />}</button>
                <button onClick={() => handleMatchAction('dislike')} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-rose-500 flex items-center justify-center shadow-xl active:scale-90"><X className="w-6 h-6 sm:w-7 sm:h-7" /></button>
                <button onClick={() => handleMatchAction('hand')} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${profiles[currentIndex]?.isAlreadyMatched ? 'bg-emerald-500' : 'bg-green-500'} text-white`}>{profiles[currentIndex]?.isAlreadyMatched ? <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" /> : <Hand className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />}</button>
              </div>
            </div>
          )}

          {/* MENSAJES */}
          {view === 'messages' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <h2 className="text-3xl font-black mb-6 uppercase tracking-tighter">{t('my_chats')}</h2>
              <div className="space-y-3">
                {activeChats.map((chat) => (
                  <div key={chat.id} onClick={() => { setActiveChatUser(chat); setView('chat'); }} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                    <img src={chat.photo || DEFAULT_AVATAR} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-100 shadow-sm" />
                    <div className="flex-1"><p className="text-lg font-bold text-stone-800 tracking-tight leading-none mb-1">{chat.name}</p><p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest leading-none">{t('chat_open')}</p></div>
                  </div>
                ))}
                {activeChats.length === 0 && <div className="mt-20 text-center opacity-30 px-8"><MessageCircle className="w-12 h-12 mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">{t('no_chats')}</p></div>}
              </div>
            </div>
          )}

          {/* CHAT ACTIVO */}
          {view === 'chat' && activeChatUser && (
            <div className="h-full flex flex-col bg-stone-50 animate-in slide-in-from-right duration-300">
              <div className="p-4 bg-white border-b flex items-center justify-between z-10 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('messages')} className="p-1 active:scale-90 transition-transform"><ChevronLeft className="w-7 h-7 text-stone-400" /></button>
                  <div onClick={() => setShowInspector(activeChatUser)} className="flex items-center gap-3 cursor-pointer active:opacity-60 transition-opacity">
                    <img src={activeChatUser.photo || DEFAULT_AVATAR} className="w-10 h-10 rounded-full object-cover shadow-sm border border-rose-100" />
                    <div><h3 className="font-black text-stone-800 uppercase leading-none">{activeChatUser.name}</h3><p className="text-[9px] font-black uppercase text-rose-500 tracking-widest mt-1 leading-none">{t('view_vip')}</p></div>
                  </div>
                </div>
                <button onClick={() => deleteConversation(activeChatUser.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
              </div>
              
              <div 
                className="flex-1 p-4 overflow-y-auto space-y-4 bg-stone-50 min-h-0 relative"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23f43f5e' fill-opacity='0.04'%3E%3Cg transform='translate(10, 10) scale(1.2)'%3E%3Cpath d='m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Zm3 16h14'/%3E%3C/g%3E%3Cg transform='translate(45, 45) scale(1.2) rotate(20 12 12)'%3E%3Cpath d='m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Zm3 16h14'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
                }}
              >
                {chatMessages.map((m) => {
                  const isMe = m.from === user.uid;
                  return (
                    <div key={m.id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && <img src={activeChatUser.photo || DEFAULT_AVATAR} className="w-8 h-8 rounded-full object-cover shrink-0 mt-auto shadow-sm" />}
                      <div className={`p-4 rounded-3xl max-w-[75%] text-sm font-medium shadow-sm ${isMe ? 'bg-rose-500 text-white rounded-br-none' : 'bg-white text-stone-700 rounded-bl-none border border-stone-100'}`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                
                {/* INDICADOR DE QUE EL OTRO ESTÁ ESCRIBIENDO */}
                {otherIsTyping && (
                  <div className="flex gap-2 justify-start animate-in fade-in slide-in-from-bottom-2">
                    <img src={activeChatUser.photo || DEFAULT_AVATAR} className="w-8 h-8 rounded-full object-cover shrink-0 mt-auto shadow-sm" />
                    <div className="p-4 rounded-3xl bg-white text-stone-700 rounded-bl-none border border-stone-100 shadow-sm flex items-center gap-1.5 h-[52px]">
                      <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
              <form onSubmit={(e) => {
                e.preventDefault(); if (!newMessageText.trim()) return;
                addDoc(chatsCol, { from: user.uid, fromName: myProfile.name, to: activeChatUser.id, text: newMessageText, timestamp: new Date().toISOString() });
                setNewMessageText('');
                // Limpiamos el estado de tecleando al enviar
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                setDoc(doc(typingCol, user.uid), { typingTo: null }, { merge: true });
              }} className="p-4 bg-white border-t flex gap-2 shrink-0">
                <input value={newMessageText} onChange={handleTypingChange} placeholder={t('write')} className="flex-1 bg-stone-100 rounded-full px-6 py-3 outline-none focus:bg-white border-transparent focus:border-rose-100 transition-all shadow-inner" />
                <button type="submit" className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"><Send className="w-5 h-5 ml-1" /></button>
              </form>
            </div>
          )}

          {/* NOTIFICACIONES */}
          {view === 'notifications' && (
            <div className="h-full p-6 bg-stone-50 overflow-y-auto animate-in slide-in-from-right">
              <div className="flex items-center justify-between mb-6"><h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{t('activity')}</h2><button onClick={() => { setNotifications([]); setHasUnreadNotifs(false); }} className="p-2 text-stone-400 hover:text-rose-500 transition-colors flex items-center gap-1"><Eraser className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">{t('clear')}</span></button></div>
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div key={notif.id} onClick={() => { setActiveChatUser({ id: notif.from, name: notif.fromName }); setView('chat'); }} className="bg-stone-900 text-white p-4 rounded-3xl shadow-lg flex items-center gap-4 cursor-pointer active:scale-95 transition-all">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.isMessage ? 'bg-rose-500' : 'bg-amber-500'}`}>{notif.isMessage ? <MessageCircle className="w-5 h-5" /> : <Beer className="w-5 h-5" />}</div>
                    <div className="flex-1"><p className="text-xs font-bold leading-tight"><b>{notif.fromName}</b> {notif.isMessage ? t('wrote_you') : t('greeted_you')}</p></div>
                  </div>
                ))}
                {notifications.length === 0 && <div className="mt-20 text-center opacity-30"><Bell className="w-12 h-12 mx-auto mb-4" /><p className="text-sm font-bold uppercase tracking-widest">{t('empty_history')}</p></div>}
              </div>
            </div>
          )}
        </div>

        {/* NAVEGACIÓN INFERIOR */}
        {['discover', 'register', 'messages', 'notifications'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 transition-all ${view === 'discover' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Flame className="w-7 h-7" /></button>
            <button onClick={() => setView('messages')} className={`p-2 relative transition-all ${view === 'messages' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><MessageCircle className="w-7 h-7" />{hasUnreadMessages && <span className="absolute top-2 right-2 w-3 h-3 bg-rose-500 border-2 border-white rounded-full animate-pulse"></span>}</button>
            <button onClick={() => { setView('notifications'); setHasUnreadNotifs(false); }} className={`p-2 relative transition-all ${view === 'notifications' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Bell className="w-7 h-7" />{hasUnreadNotifs && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>}</button>
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* MODAL ELIMINAR CUENTA */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertCircle className="w-8 h-8" /></div>
              <h3 className="text-2xl font-black text-stone-800 mb-2 uppercase leading-none">{t('del_title')}</h3>
              <p className="text-stone-500 mb-8 text-sm italic">{t('del_desc')}</p>
              <div className="space-y-3">
                <button onClick={handleDeleteAccount} className="w-full py-4 rounded-full bg-red-500 text-white font-bold text-lg active:scale-95 transition-all">{t('yes_del')}</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 rounded-full bg-stone-100 text-stone-800 font-bold text-lg active:scale-95 transition-all">{t('cancel')}</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL QR DESCUENTO */}
        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800 transition-colors"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-2 tracking-tighter uppercase font-black leading-none">{t('qr_title')}</h3>
              <p className="text-sm text-stone-600 mb-6 leading-tight">{t('qr_explanation')}</p>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${user?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply mx-auto mb-4" />
              <p className="text-[10px] text-stone-500 uppercase font-black tracking-widest opacity-60 leading-none">{t('qr_desc')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}