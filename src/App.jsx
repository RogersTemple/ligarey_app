import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut, AlertCircle
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
  collection,
  getDocs
} from 'firebase/firestore';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Forzamos persistencia para que no olvide la sesión al cerrar el navegador o refrescar
setPersistence(auth, browserLocalPersistence).catch(console.error);

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
    phrase: 'Viviendo el momento, un concierto a la vez. ✨',
    interests: ['Rock', 'Cerveza fría', 'Festivales'],
  }
];

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1544502062-f82887f03d1c?w=400&h=400&fit=crop";

export default function App() {
  const [view, setView] = useState('welcome');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [currentUser, setCurrentUser] = useState(null); 
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [profileMode, setProfileMode] = useState('edit');
  const [myProfile, setMyProfile] = useState({
    name: '', photo: null, phrase: '', lookingFor: '', interests: []
  });
  
  const [tempPhoto, setTempPhoto] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 

  const [profiles, setProfiles] = useState(PERFILES_MOCK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQRModal, setShowQRModal] = useState(false);

  const fileInputRef = useRef(null);

  // --- LÓGICA DE INICIO (FIJADA PARA EVITAR PANTALLA BLANCA) ---
  useEffect(() => {
    // Temporizador de seguridad para que la app cargue sí o sí en 5 segundos
    const safetyTimer = setTimeout(() => setIsInitializing(false), 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setMyProfile({
              name: data.name || '',
              photo: data.photo || null,
              phrase: data.phrase || '',
              lookingFor: data.lookingFor || '',
              interests: data.interests || []
            });
            // Si ya tiene perfil, lo mandamos a la pista automáticamente al arrancar
            if (data.name) setView('discover');
            else setView('register');
          } else {
            setView('register');
          }
        } catch (e) { 
          console.error("Error cargando perfil:", e);
          setView('register');
        }
      } else {
        setCurrentUser(null);
        setView('welcome');
      }
      clearTimeout(safetyTimer);
      setIsInitializing(false);
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []); // [] para que solo se ejecute una vez al cargar la web

  // --- CARGAR USUARIOS REALES ---
  useEffect(() => {
    if (view === 'discover' && currentUser) {
      const fetchRealUsers = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'usuarios'));
          const realUsers = [];
          querySnapshot.forEach((doc) => {
            if (doc.id !== currentUser.uid) {
              const data = doc.data();
              if (data.name) realUsers.push({ id: doc.id, ...data });
            }
          });
          if (realUsers.length > 0) setProfiles(realUsers);
        } catch (e) { console.error("Error cargando pista:", e); }
      };
      fetchRealUsers();
    }
  }, [view, currentUser]);

  // --- FUNCIONES ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
        // El useEffect de arriba detectará el login y cambiará la vista
      } else if (authMode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', userCredential.user.uid), {
          email: authForm.email,
          fechaRegistro: new Date().toISOString()
        }, { merge: true });
        setView('register');
      }
    } catch (error) {
      setAuthError('Error de acceso. Revisa tus datos.');
      setIsAuthLoading(false);
    }
  };

  const saveProfileData = async () => {
    if (!currentUser) return false;
    setIsSavingProfile(true);
    setPhotoError('');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', currentUser.uid), {
        name: myProfile.name,
        photo: myProfile.photo,
        phrase: myProfile.phrase,
        lookingFor: myProfile.lookingFor,
        interests: myProfile.interests
      }, { merge: true });
      setSaveMessage('¡Perfil guardado!');
      setTimeout(() => setSaveMessage(''), 3000);
      return true;
    } catch (e) { 
      setPhotoError('Error al guardar. La foto puede ser muy grande.'); 
      return false; 
    } finally { setIsSavingProfile(false); }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [] });
      setAuthForm({ email: '', password: '' });
      setView('welcome');
    } catch (e) { console.error("Error al salir:", e); }
  };

  const toggleInterest = (interest) => {
    setMyProfile(prev => {
      const interests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 5 ? [...prev.interests, interest] : prev.interests;
      return { ...prev, interests };
    });
  };

  const handleGoToPista = async () => {
    if (!myProfile.name.trim()) { setPhotoError('El nombre es obligatorio.'); return; }
    const ok = await saveProfileData();
    if (ok) setView('discover');
  };

  // --- PANTALLA DE CARGA ---
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center gap-4">
        <Crown className="w-16 h-16 text-rose-500 animate-pulse" />
        <p className="text-stone-400 font-bold tracking-widest text-xs uppercase">Cargando LigaRey...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans overflow-hidden">
      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* Cabecera */}
        {view !== 'welcome' && view !== 'auth' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-rose-500" />
              <h1 className="text-xl font-black text-rose-500 tracking-tighter">LIGAREY</h1>
            </div>
            <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1">
              <QrCode className="w-3 h-3" /> DESCUENTO REY
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          
          {/* BIENVENIDA */}
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-8 bg-stone-50 animate-in fade-in duration-500">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                <Crown className="text-white w-16 h-16" />
              </div>
              <div className="space-y-2">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 pb-2">LigaRey</h1>
                <p className="text-stone-500 italic font-medium">Encuentra nuevos amigos</p>
              </div>
              <div className="w-full max-w-xs space-y-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Crear una cuenta</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold active:scale-95 transition-all">Ya tengo cuenta</button>
              </div>
            </div>
          )}

          {/* AUTH */}
          {view === 'auth' && (
            <div className="h-full flex flex-col p-6 bg-stone-50 animate-in slide-in-from-right duration-300">
              <button onClick={() => setView('welcome')} className="self-start p-2 text-stone-400 mb-6"><ChevronLeft className="w-8 h-8" /></button>
              <div className="max-w-sm w-full mx-auto">
                <h2 className="text-4xl font-black text-stone-900 mb-2 tracking-tighter">{authMode === 'login' ? 'Bienvenido' : 'Únete al VIP'}</h2>
                <p className="text-stone-500 mb-8 text-sm">{authMode === 'login' ? 'Inicia sesión para entrar en la pista.' : 'Regístrate gratis y conoce gente hoy.'}</p>
                {authError && <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-3 rounded-xl border border-red-100">{authError}</p>}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500" />
                  <input type="password" required placeholder="Contraseña" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500" />
                  <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold flex justify-center items-center h-14 shadow-lg active:scale-95 transition-all">
                    {isAuthLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? 'Entrar' : 'Registrarse')}
                  </button>
                </form>
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-stone-500 text-xs font-bold uppercase tracking-widest">{authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}</button>
              </div>
            </div>
          )}

          {/* PERFIL */}
          {view === 'register' && (
            <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
              <h2 className="text-2xl font-black text-stone-900 text-center mb-6 uppercase tracking-tighter">Mi Perfil</h2>
              
              <div className="flex justify-center mb-6 bg-stone-200 rounded-full p-1 shadow-inner">
                <button onClick={() => setProfileMode('edit')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'edit' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>EDITAR</button>
                <button onClick={() => setProfileMode('preview')} className={`flex-1 py-2 rounded-full font-bold text-xs transition-all ${profileMode === 'preview' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>VISTA PREVIA</button>
              </div>

              {profileMode === 'edit' ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer">
                      {myProfile.photo ? <img src={myProfile.photo} className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.size <= 400 * 1024) {
                        const reader = new FileReader();
                        reader.onloadend = () => { setTempPhoto(reader.result); setIsCropping(true); };
                        reader.readAsDataURL(file);
                      } else { setPhotoError('La foto pesa demasiado. Máximo 400KB.'); }
                    }} className="hidden" />
                    <p className={`text-[10px] mt-2 font-bold ${photoError ? 'text-red-500' : 'text-stone-400'}`}>{photoError || 'Foto máx 400KB'}</p>
                  </div>

                  <div className="space-y-4">
                    <input type="text" placeholder="Tu nombre" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm" />
                    <input type="text" placeholder="Frase estrella" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 italic outline-none focus:border-rose-400 shadow-sm" />
                    <textarea placeholder="¿Qué buscas?" value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 h-24 outline-none focus:border-rose-400 shadow-sm" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 15).map(int => (
                      <button key={int} onClick={() => toggleInterest(int)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${myProfile.interests.includes(int) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>

                  <div className="pt-6 space-y-4">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs bg-green-50 py-2 rounded-lg border border-green-100">{saveMessage}</p>}
                    <button onClick={() => saveProfileData()} disabled={isSavingProfile} className="w-full h-14 bg-stone-900 text-white rounded-2xl font-bold flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all text-xs">
                      {isSavingProfile ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'GUARDAR PERFIL'}
                    </button>
                    <button onClick={handleLogout} className="w-full text-red-500 font-bold text-sm uppercase tracking-widest py-2 active:opacity-50">Cerrar Sesión</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200">
                  {myProfile.photo ? <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-stone-400"><Camera className="w-12 h-12" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full">
                    <h2 className="text-3xl font-black tracking-tighter">{myProfile.name || 'Tu Nombre'}</h2>
                    <p className="text-rose-300 font-bold mb-3 italic">"{myProfile.phrase || 'Tu frase'}"</p>
                    <div className="flex flex-wrap gap-2">{myProfile.interests.map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[9px] uppercase font-bold">{i}</span>)}</div>
                  </div>
                </div>
              )}
              <button onClick={handleGoToPista} disabled={isSavingProfile} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl flex justify-center items-center gap-2 uppercase tracking-widest active:scale-95 transition-all h-16">
                {isSavingProfile ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : '¡A LA PISTA!'}
              </button>
            </div>
          )}

          {/* DISCOVER */}
          {view === 'discover' && profiles.length > 0 && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative">
              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-stone-200">
                <img src={profiles[currentIndex]?.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"></div>
                <div className="absolute bottom-0 p-6 text-white w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-4xl font-black tracking-tighter leading-none">{profiles[currentIndex]?.name}</h2>
                    {profiles[currentIndex]?.id?.startsWith('m') && <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] uppercase font-bold">Bot</span>}
                  </div>
                  <p className="text-rose-300 font-bold mb-4 italic leading-tight">"{profiles[currentIndex]?.phrase || 'Hola!'}"</p>
                  <div className="flex flex-wrap gap-2">
                    {(profiles[currentIndex]?.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold">{i}</span>)}
                  </div>
                </div>
              </div>
              <div className="flex justify-center items-center gap-4 py-6">
                <button onClick={() => setCurrentIndex(prev => (prev + 1) % profiles.length)} className="w-16 h-16 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-amber-500"><Beer className="w-8 h-8" /></button>
                <button onClick={() => setCurrentIndex(prev => (prev + 1) % profiles.length)} className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-red-50"><X className="w-7 h-7" /></button>
                <button onClick={() => setCurrentIndex(prev => (prev + 1) % profiles.length)} className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-green-600"><Hand className="w-8 h-8" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Navegación Inferior */}
        {['discover', 'register'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 transition-all ${view === 'discover' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Flame className="w-7 h-7" /></button>
            <button className="p-2 text-stone-200 cursor-not-allowed"><MessageCircle className="w-7 h-7" /></button>
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* Modal Recorte */}
        {isCropping && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-md animate-in fade-in">
            <img src={tempPhoto} alt="Crop" className="w-64 h-64 rounded-full object-cover mb-8 border-4 border-rose-500 shadow-2xl" />
            <div className="flex gap-4 w-full max-w-xs">
              <button onClick={() => setIsCropping(false)} className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-bold">CANCELAR</button>
              <button onClick={() => { setMyProfile(p => ({...p, photo: tempPhoto})); setIsCropping(false); }} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold">ACEPTAR</button>
            </div>
          </div>
        )}

        {/* Modal QR */}
        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tighter uppercase">Descuento Rey</h3>
              <div className="bg-stone-100 p-4 rounded-3xl inline-block mb-4 shadow-inner border border-stone-200">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${currentUser?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply" />
              </div>
              <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">En barra principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}