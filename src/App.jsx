import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  onAuthStateChanged, 
  signOut, 
  setPersistence, 
  browserLocalPersistence 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCCPXwU33jrYr5nRVyTnQGWeCY_6W-FmXc",
  authDomain: "ligarey.firebaseapp.com",
  projectId: "ligarey",
  storageBucket: "ligarey.firebasestorage.app",
  messagingSenderId: "625102595981",
  appId: "1:625102595981:web:baf09f9cda0d1b3b19ffc4",
  measurementId: "G-ZYLWEZX85C"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Forzamos la persistencia de sesión para que no te eche al recargar
setPersistence(auth, browserLocalPersistence).catch(err => console.error("Error persistencia:", err));

const db = getFirestore(app);

// --- CONSTANTES ---
const INTERESES_COMUNES = [
  "Rock", "Pop", "Indie", "Reggaetón", "Electrónica", "Trap", "Metal",
  "Cerveza fría", "Cócteles", "Vino", "Bailar", "Pogo", "Primera fila",
  "VIP", "Acampada", "Post-concierto", "Hacer fotos", "Charlas profundas",
  "Conocer gente", "Viajar", "Festivales", "Tatuajes", "Moda", "Deporte"
];

const PERFILES_MOCK = [
  {
    id: 'm1',
    name: 'Lucía (Ejemplo)',
    age: 24,
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop',
    lookingFor: 'Alguien que se sepa todas las letras de Arctic Monkeys',
    phrase: 'Viviendo el momento, un concierto a la vez. ✨ (Perfil de prueba)',
    interests: ['Rock', 'Cerveza fría', 'Festivales'],
  },
  {
    id: 'm2',
    name: 'Carlos (Ejemplo)',
    age: 27,
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop',
    lookingFor: 'Gente para ir al escenario principal en 1 hora',
    phrase: 'Buscando el mejor pogo de la noche. (Perfil de prueba)',
    interests: ['Indie', 'Pogo', 'Electrónica'],
  },
  {
    id: 'm3',
    name: 'Elena (Ejemplo)',
    age: 22,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop',
    lookingFor: 'Alguien para compartir glitter y baile',
    phrase: 'Si hay techno, ahí me encuentras. (Perfil de prueba)',
    interests: ['Electrónica', 'Bailar', 'Moda'],
  }
];

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1544502062-f82887f03d1c?w=400&h=400&fit=crop";

export default function App() {
  const [view, setView] = useState('welcome');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', terms: false, marketing: false });
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [currentUser, setCurrentUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [profileMode, setProfileMode] = useState('edit');
  const [myProfile, setMyProfile] = useState({
    name: '',
    photo: null,
    phrase: '',
    lookingFor: '',
    interests: []
  });
  
  const [tempPhoto, setTempPhoto] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 

  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState([]); 
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState({});
  const [chatText, setChatText] = useState('');
  const [showMatchAnimation, setShowMatchAnimation] = useState(null); 
  const [showQRModal, setShowQRModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // --- AUTO-LOGIN Y CARGA DE DATOS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const docRef = doc(db, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setMyProfile({
              name: data.name || '',
              photo: data.photo || null,
              phrase: data.phrase || '',
              lookingFor: data.lookingFor || '',
              interests: data.interests || []
            });
            // Si ya tiene nombre configurado, va directo a la pista
            if (data.name && view === 'welcome') setView('discover');
          }
        } catch (error) {
          console.error("Error cargando perfil:", error);
        }
      } else {
        setCurrentUser(null);
        setView('welcome');
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // --- AUTH LOGIC ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
        setView('discover');
      } else if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
          email: authForm.email,
          aceptaMarketing: authForm.marketing,
          aceptaTerminos: authForm.terms,
          fechaRegistro: new Date().toISOString()
        }, { merge: true });
        setView('register');
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, authForm.email);
        setRecoveryMessage('Enlace enviado. Revisa tu correo.');
        setTimeout(() => { setRecoveryMessage(''); setAuthMode('login'); }, 3000);
      }
    } catch (error) {
      console.error(error.code);
      switch(error.code) {
        case 'auth/email-already-in-use': setAuthError('Este correo ya está registrado.'); break;
        case 'auth/invalid-credential': setAuthError('Datos incorrectos.'); break;
        default: setAuthError('Error de conexión. Inténtalo de nuevo.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // --- PROFILE LOGIC ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPhotoError('');
    if (file) {
      // Límite estricto de 400KB para evitar fallos de Firestore
      if (file.size > 400 * 1024) {
        setPhotoError('La foto es demasiado pesada. Máximo 400KB (hazle una captura de pantalla).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => { setTempPhoto(reader.result); setIsCropping(true); };
      reader.readAsDataURL(file);
    }
  };

  const confirmCrop = () => {
    setMyProfile(prev => ({ ...prev, photo: tempPhoto }));
    setIsCropping(false);
  };

  const toggleInterest = (interest) => {
    setMyProfile(prev => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 5 ? [...prev.interests, interest] : prev.interests;
      return { ...prev, interests };
    });
  };

  const saveProfileData = async (silent = false) => {
    const user = auth.currentUser;
    if (!user) return false;

    if (!silent) setIsSavingProfile(true);
    setPhotoError('');

    try {
      const userRef = doc(db, 'usuarios', user.uid);
      await setDoc(userRef, {
        name: myProfile.name || '',
        photo: myProfile.photo || null,
        phrase: myProfile.phrase || '',
        lookingFor: myProfile.lookingFor || '',
        interests: myProfile.interests || []
      }, { merge: true });

      if (!silent) {
        setSaveMessage('¡Datos guardados!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
      return true;
    } catch (error) {
      console.error("Error guardando:", error);
      if (error.code === 'permission-denied') {
        setPhotoError('Permiso denegado. Revisa las reglas de Firebase.');
      } else {
        setPhotoError('Error al guardar. Prueba a quitar la foto primero.');
      }
      return false;
    } finally {
      if (!silent) setIsSavingProfile(false);
    }
  };

  const handleGoToPista = async () => {
    if (!myProfile.name.trim()) {
      setPhotoError('Debes poner al menos tu nombre.');
      return;
    }
    const success = await saveProfileData();
    if (success) setView('discover');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [] });
    setView('welcome');
  };

  // --- VIEWS ---
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-900 flex justify-center items-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Crown className="w-16 h-16 text-rose-500" />
          <p className="text-stone-400 font-bold tracking-widest text-xs uppercase">Conectando con la pista...</p>
        </div>
      </div>
    );
  }

  const WelcomeView = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-8 bg-stone-50">
      <div className="relative">
        <div className="absolute inset-0 bg-rose-400 blur-3xl opacity-20"></div>
        <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl relative z-10 border-4 border-white">
          <Crown className="text-white w-16 h-16" />
        </div>
      </div>
      <div>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 pb-2">LigaRey</h1>
        <p className="text-stone-500 italic">Encuentra nuevos amigos</p>
      </div>
      <div className="w-full max-w-xs space-y-4">
        <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Crear cuenta</button>
        <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold active:scale-95 transition-all">Entrar</button>
      </div>
    </div>
  );

  const AuthView = () => (
    <div className="h-full flex flex-col p-6 bg-stone-50 overflow-y-auto">
      <button onClick={() => setView('welcome')} className="self-start p-2 text-stone-400 mb-6"><ChevronLeft className="w-8 h-8" /></button>
      <div className="max-w-sm w-full mx-auto">
        <h2 className="text-4xl font-black text-stone-900 mb-2">{authMode === 'login' ? 'Hola de nuevo' : 'Únete al VIP'}</h2>
        <p className="text-stone-500 mb-8 text-sm">Introduce tus datos para acceder.</p>
        
        {authError && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100"><X className="w-4 h-4" /> {authError}</div>}
        {recoveryMessage && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-2xl text-xs font-bold border border-green-100">{recoveryMessage}</div>}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500" />
          {authMode !== 'forgot' && <input type="password" required placeholder="Contraseña" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500" />}
          
          <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {isAuthLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? 'Entrar' : 'Registrarse')}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-stone-500 text-sm">{authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}</button>
      </div>
    </div>
  );

  const RegisterView = () => (
    <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
      <h2 className="text-2xl font-black text-stone-900 text-center mb-6">Tu Perfil</h2>
      
      {isCropping && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-md">
          <img src={tempPhoto} alt="Crop" className="w-64 h-64 rounded-full object-cover mb-8 border-4 border-rose-500 shadow-2xl" />
          <div className="flex gap-4 w-full max-w-xs">
            <button onClick={() => setIsCropping(false)} className="flex-1 py-4 bg-white/10 text-white rounded-2xl">Cancelar</button>
            <button onClick={confirmCrop} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold">Aceptar</button>
          </div>
        </div>
      )}

      <div className="flex justify-center mb-6 bg-stone-200 rounded-full p-1">
        <button onClick={() => setProfileMode('edit')} className={`flex-1 py-2 rounded-full font-bold text-xs ${profileMode === 'edit' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>EDITAR</button>
        <button onClick={() => setProfileMode('preview')} className={`flex-1 py-2 rounded-full font-bold text-xs ${profileMode === 'preview' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>VISTA PREVIA</button>
      </div>

      {profileMode === 'edit' ? (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col items-center">
            <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer relative group">
              {myProfile.photo ? <img src={myProfile.photo} alt="Profile" className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Upload className="w-6 h-6" /></div>
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            {photoError ? <p className="text-red-500 text-[10px] mt-2 font-bold text-center max-w-[200px]">{photoError}</p> : <p className="text-stone-400 text-[10px] mt-2">Sube una foto (Máx 400KB)</p>}
          </div>

          <div className="space-y-4">
            <input type="text" placeholder="Tu nombre" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 focus:border-rose-400 outline-none shadow-sm" />
            <input type="text" placeholder="Tu frase estrella" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 italic outline-none shadow-sm" />
            <textarea placeholder="¿Qué buscas en el festival?" value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 h-24 outline-none shadow-sm" />
          </div>

          <div className="flex flex-wrap gap-2">
            {INTERESES_COMUNES.slice(0, 15).map(int => (
              <button key={int} onClick={() => toggleInterest(int)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${myProfile.interests.includes(int) ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white text-stone-500'}`}>{int}</button>
            ))}
          </div>

          <div className="pt-6 space-y-3">
            {saveMessage && <div className="p-3 bg-green-50 text-green-700 rounded-xl text-center text-xs font-bold border border-green-100 animate-bounce">{saveMessage}</div>}
            <button onClick={() => saveProfileData()} disabled={isSavingProfile} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2">
              {isSavingProfile ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'GUARDAR CAMBIOS'}
            </button>
            <button onClick={handleLogout} className="w-full py-4 text-red-500 font-bold text-sm flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> CERRAR SESIÓN</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-[400px] relative rounded-[2rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200">
          {myProfile.photo ? <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-stone-400"><Camera className="w-12 h-12" /></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <div className="absolute bottom-0 p-6 text-white w-full">
            <h2 className="text-3xl font-black">{myProfile.name || 'Tu Nombre'}</h2>
            <p className="text-rose-300 font-bold mb-3 italic">"{myProfile.phrase || 'Frase estrella'}"</p>
            <div className="flex flex-wrap gap-2">{myProfile.interests.map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[9px] uppercase font-bold">{i}</span>)}</div>
          </div>
        </div>
      )}
      <button onClick={handleGoToPista} disabled={isSavingProfile} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest">
        {isSavingProfile ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '¡A la Pista!'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans">
      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        {view !== 'welcome' && view !== 'auth' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-rose-500" /><h1 className="text-xl font-black text-rose-500">LIGAREY</h1></div>
            <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1"><QrCode className="w-3 h-3" /> DESCUENTO REY</button>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden relative">
          {view === 'welcome' && <WelcomeView />}
          {view === 'auth' && <AuthView />}
          {view === 'register' && <RegisterView />}
          {view === 'discover' && <div className="h-full flex flex-col p-4 bg-stone-100 relative">
              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-stone-200 bg-white">
                <img src={PERFILES_MOCK[currentIndex].photo} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"></div>
                <div className="absolute bottom-0 p-6 text-white w-full">
                  <h2 className="text-4xl font-black">{PERFILES_MOCK[currentIndex].name}, {PERFILES_MOCK[currentIndex].age}</h2>
                  <p className="text-rose-300 font-bold mb-4">"{PERFILES_MOCK[currentIndex].phrase}"</p>
                  <div className="flex flex-wrap gap-2">{PERFILES_MOCK[currentIndex].interests.map(i => <span key={i} className="px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold">{i}</span>)}</div>
                </div>
              </div>
              <div className="flex justify-center items-center gap-4 py-6">
                <button onClick={() => setCurrentIndex((currentIndex + 1) % 3)} className="w-16 h-16 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-lg active:scale-90"><Beer className="w-8 h-8" /></button>
                <button onClick={() => setCurrentIndex((currentIndex + 1) % 3)} className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90"><X className="w-7 h-7" /></button>
                <button onClick={() => setCurrentIndex((currentIndex + 1) % 3)} className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg active:scale-90"><Hand className="w-8 h-8" /></button>
              </div>
          </div>}
        </div>

        {['discover'].includes(view) && (
          <div className="bg-white/80 backdrop-blur-md border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 ${view === 'discover' ? 'text-rose-500' : 'text-stone-400'}`}><Flame className="w-7 h-7" /></button>
            <button className="p-2 text-stone-400"><MessageCircle className="w-7 h-7" /></button>
            <button onClick={() => setView('register')} className={`p-2 ${view === 'register' ? 'text-rose-500' : 'text-stone-400'}`}><User className="w-7 h-7" /></button>
          </div>
        )}
      </div>
    </div>
  );
}