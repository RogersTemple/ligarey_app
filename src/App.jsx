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
  const [showQRModal, setShowQRModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fileInputRef = useRef(null);

  // --- LOGICA DE INICIO ---
  useEffect(() => {
    const safetyTimer = setTimeout(() => setIsInitializing(false), 4000);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const docSnap = await Promise.race([
            getDoc(doc(db, 'usuarios', user.uid)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3500))
          ]);
          if (docSnap && docSnap.exists()) {
            const data = docSnap.data();
            setMyProfile({
              name: data.name || '',
              photo: data.photo || null,
              phrase: data.phrase || '',
              lookingFor: data.lookingFor || '',
              interests: data.interests || []
            });
            if (data.name && view === 'welcome') setView('discover');
          }
        } catch (error) { console.warn("Error carga datos"); }
      } else {
        setCurrentUser(null);
        setView('welcome');
      }
      clearTimeout(safetyTimer);
      setIsInitializing(false);
    });
    return () => { unsubscribe(); clearTimeout(safetyTimer); };
  }, [view]);

  // --- FUNCIONES ---
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
          fechaRegistro: new Date().toISOString()
        }, { merge: true });
        setView('register');
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, authForm.email);
        setRecoveryMessage('Enlace enviado.');
        setTimeout(() => { setRecoveryMessage(''); setAuthMode('login'); }, 3000);
      }
    } catch (error) {
      setAuthError('Error de acceso. Revisa tus datos.');
    } finally { setIsAuthLoading(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 400 * 1024) { setPhotoError('Máximo 400KB.'); return; }
      const reader = new FileReader();
      reader.onloadend = () => { setTempPhoto(reader.result); setIsCropping(true); };
      reader.readAsDataURL(file);
    }
  };

  const confirmCrop = () => { setMyProfile(prev => ({ ...prev, photo: tempPhoto })); setIsCropping(false); };

  const toggleInterest = (interest) => {
    setMyProfile(prev => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 5 ? [...prev.interests, interest] : prev.interests;
      return { ...prev, interests };
    });
  };

  const saveProfileData = async (silent = false) => {
    if (!currentUser) return false;
    if (!silent) setIsSavingProfile(true);
    try {
      await setDoc(doc(db, 'usuarios', currentUser.uid), {
        name: myProfile.name || '',
        photo: myProfile.photo || null,
        phrase: myProfile.phrase || '',
        lookingFor: myProfile.lookingFor || '',
        interests: myProfile.interests || []
      }, { merge: true });
      if (!silent) { setSaveMessage('¡Guardado!'); setTimeout(() => setSaveMessage(''), 2000); }
      return true;
    } catch (e) { setPhotoError('Error al guardar.'); return false; }
    finally { setIsSavingProfile(false); }
  };

  const handleGoToPista = async () => {
    if (!myProfile.name.trim()) { setPhotoError('Nombre obligatorio.'); return; }
    const success = await saveProfileData();
    if (success) setView('discover');
  };

  // --- PANTALLA DE CARGA ---
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-900 flex justify-center items-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Crown className="w-16 h-16 text-rose-500" />
          <p className="text-stone-400 font-bold tracking-widest text-xs">CONECTANDO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans">
      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        {view !== 'welcome' && view !== 'auth' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-rose-500" /><h1 className="text-xl font-black text-rose-500">LIGAREY</h1></div>
            <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1"><QrCode className="w-3 h-3" /> DESCUENTO REY</button>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          
          {/* VISTA: BIENVENIDA */}
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-8 bg-stone-50">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                <Crown className="text-white w-16 h-16" />
              </div>
              <div>
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 pb-2">LigaRey</h1>
                <p className="text-stone-500 italic font-medium">Encuentra nuevos amigos</p>
              </div>
              <div className="w-full max-w-xs space-y-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Crear cuenta</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold active:scale-95 transition-all">Entrar</button>
              </div>
            </div>
          )}

          {/* VISTA: AUTH */}
          {view === 'auth' && (
            <div className="h-full flex flex-col p-6 bg-stone-50 overflow-y-auto">
              <button onClick={() => setView('welcome')} className="self-start p-2 text-stone-400 mb-6"><ChevronLeft className="w-8 h-8" /></button>
              <div className="max-w-sm w-full mx-auto">
                <h2 className="text-4xl font-black text-stone-900 mb-2">{authMode === 'login' ? 'Hola' : 'VIP'}</h2>
                {authError && <p className="text-red-500 text-xs font-bold mb-4">{authError}</p>}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none" />
                  {authMode !== 'forgot' && <input type="password" required placeholder="Contraseña" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none" />}
                  <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold flex justify-center">
                    {isAuthLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? 'Entrar' : 'Registrar')}
                  </button>
                </form>
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-stone-500 text-sm">{authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}</button>
              </div>
            </div>
          )}

          {/* VISTA: PERFIL / REGISTRO */}
          {view === 'register' && (
            <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
              <h2 className="text-2xl font-black text-stone-900 text-center mb-6">Tu Perfil</h2>
              
              {isCropping && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-md">
                  <img src={tempPhoto} alt="Crop" className="w-64 h-64 rounded-full object-cover mb-8 border-4 border-rose-500" />
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
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer">
                      {myProfile.photo ? <img src={myProfile.photo} alt="Profile" className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <p className="text-stone-400 text-[10px] mt-2">{photoError || 'Sube una foto (Máx 400KB)'}</p>
                  </div>
                  <input type="text" placeholder="Tu nombre" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none" />
                  <input type="text" placeholder="Tu frase estrella" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 italic outline-none" />
                  <textarea placeholder="¿Qué buscas?" value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 h-24 outline-none" />
                  
                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 15).map(int => (
                      <button key={int} onClick={() => toggleInterest(int)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border ${myProfile.interests.includes(int) ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>

                  <div className="pt-6 space-y-3">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs">{saveMessage}</p>}
                    <button onClick={() => saveProfileData()} disabled={isSavingProfile} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold flex justify-center items-center gap-2">
                      {isSavingProfile ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'GUARDAR CAMBIOS'}
                    </button>
                    <button onClick={() => signOut(auth)} className="w-full py-4 text-red-500 font-bold text-sm">CERRAR SESIÓN</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200">
                  {myProfile.photo && <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full">
                    <h2 className="text-3xl font-black">{myProfile.name || 'Tu Nombre'}</h2>
                    <p className="text-rose-300 font-bold mb-3 italic">"{myProfile.phrase || 'Frase estrella'}"</p>
                    <div className="flex flex-wrap gap-2">{myProfile.interests.map(i => <span key={i} className="px-2 py-1 bg-white/20 rounded text-[9px] uppercase font-bold">{i}</span>)}</div>
                  </div>
                </div>
              )}
              <button onClick={handleGoToPista} disabled={isSavingProfile} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-lg flex justify-center items-center gap-2 uppercase tracking-widest">
                {isSavingProfile ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '¡A LA PISTA!'}
              </button>
            </div>
          )}

          {/* VISTA: DISCOVER (Pista) */}
          {view === 'discover' && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative">
              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white">
                <img src={PERFILES_MOCK[currentIndex].photo} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"></div>
                <div className="absolute bottom-0 p-6 text-white w-full">
                  <h2 className="text-4xl font-black">{PERFILES_MOCK[currentIndex].name}, {PERFILES_MOCK[currentIndex].age}</h2>
                  <p className="text-rose-300 font-bold mb-4 italic">"{PERFILES_MOCK[currentIndex].phrase}"</p>
                  <div className="flex flex-wrap gap-2">{PERFILES_MOCK[currentIndex].interests.map(i => <span key={i} className="px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold">{i}</span>)}</div>
                </div>
              </div>
              <div className="flex justify-center items-center gap-4 py-6">
                <button onClick={() => setCurrentIndex((currentIndex + 1) % 3)} className="w-16 h-16 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-lg active:scale-90"><Beer className="w-8 h-8" /></button>
                <button onClick={() => setCurrentIndex((currentIndex + 1) % 3)} className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90"><X className="w-7 h-7" /></button>
                <button onClick={() => setCurrentIndex((currentIndex + 1) % 3)} className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg active:scale-90"><Hand className="w-8 h-8" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Navegación Inferior */}
        {['discover', 'register'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 ${view === 'discover' ? 'text-rose-500' : 'text-stone-400'}`}><Flame className="w-7 h-7" /></button>
            <button className="p-2 text-stone-400"><MessageCircle className="w-7 h-7" /></button>
            <button onClick={() => setView('register')} className={`p-2 ${view === 'register' ? 'text-rose-500' : 'text-stone-400'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* Modal QR */}
        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-400"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tighter uppercase">Tu Descuento Rey</h3>
              <div className="bg-stone-100 p-4 rounded-3xl inline-block mb-4 shadow-inner">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${currentUser?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply" />
              </div>
              <p className="text-xs text-stone-500 uppercase font-bold tracking-widest">En barra principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}