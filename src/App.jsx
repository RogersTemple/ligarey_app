import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut, AlertCircle, Bell
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
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
  getDocs,
  addDoc,
  onSnapshot,
  query
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
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(console.error);

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
  
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 

  const [profiles, setProfiles] = useState(PERFILES_MOCK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchAnimation, setShowMatchAnimation] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // --- NUEVOS ESTADOS PARA NOTIFICACIONES ---
  const [notifications, setNotifications] = useState([]);
  const [newNotificationToast, setNewNotificationToast] = useState(null);

  // --- LÓGICA DE INICIO ---
  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 6000);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Pedir permiso para notificaciones del sistema
        if ("Notification" in window) {
          Notification.requestPermission();
        }
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setMyProfile({
              name: data.name || '',
              photo: data.photo || null,
              phrase: data.phrase || '',
              lookingFor: data.lookingFor || '',
              interests: data.interests || []
            });
            if (data.name && (view === 'welcome' || view === 'auth')) setView('discover');
          }
        } catch (e) {
          setView('register');
        }
      } else {
        setCurrentUser(null);
        setView('welcome');
      }
      clearTimeout(timer);
      setIsInitializing(false);
    });
    return () => { unsubscribe(); clearTimeout(timer); };
  }, []);

  // --- ESCUCHADOR DE NOTIFICACIONES EN TIEMPO REAL ---
  useEffect(() => {
    if (!currentUser) return;

    // Escuchamos la colección de matches
    const q = query(collection(db, 'matches'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const matchData = change.doc.data();
          
          // Si el match es PARA MÍ y no lo envié yo mismo
          if (matchData.to === currentUser.uid) {
            const newNotif = { id: change.doc.id, ...matchData };
            
            // 1. Añadir a la lista
            setNotifications(prev => [newNotif, ...prev]);

            // 2. Mostrar aviso visual (Toast)
            setNewNotificationToast(newNotif);
            setTimeout(() => setNewNotificationToast(null), 5000);

            // 3. Notificación del sistema (Browser Push)
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("¡Nuevo Match en LigaRey!", {
                body: `${matchData.fromName} te ha enviado un ${matchData.type === 'beer' ? 'brindis' : 'saludo'}.`,
                icon: "/favicon.ico"
              });
            }
          }
        }
      });
    }, (error) => console.error("Error en listener de matches:", error));

    return () => unsubscribe();
  }, [currentUser]);

  // --- CARGAR USUARIOS REALES ---
  useEffect(() => {
    if (view === 'discover' && currentUser) {
      const fetchUsers = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'usuarios'));
          const realUsers = [];
          querySnapshot.forEach((doc) => {
            if (doc.id !== currentUser.uid) {
              const data = doc.data();
              if (data.name) realUsers.push({ id: doc.id, ...data });
            }
          });
          setProfiles(realUsers.length > 0 ? [...realUsers, ...PERFILES_MOCK] : PERFILES_MOCK);
        } catch (e) { console.error("Error cargando pista:", e); }
      };
      fetchUsers();
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
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
          email: authForm.email,
          fechaRegistro: new Date().toISOString()
        });
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
      await setDoc(doc(db, 'usuarios', currentUser.uid), {
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
      setPhotoError('Error al guardar.');
      return false;
    } finally { setIsSavingProfile(false); }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [] });
    setNotifications([]);
    setView('welcome');
  };

  const handleMatchAction = async (type) => {
    if (showMatchAnimation) return;
    const targetUser = profiles[currentIndex];
    setShowMatchAnimation(type);

    if (currentUser && !targetUser.id.startsWith('m')) {
      try {
        await addDoc(collection(db, 'matches'), {
          from: currentUser.uid,
          fromName: myProfile.name || 'Alguien',
          to: targetUser.id,
          toName: targetUser.name,
          type: type,
          timestamp: new Date().toISOString()
        });
      } catch (e) { console.error("Error al guardar match:", e); }
    }

    setTimeout(() => {
      setShowMatchAnimation(null);
      setCurrentIndex(prev => (prev + 1) % profiles.length);
    }, 1500);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center gap-4">
        <Crown className="w-16 h-16 text-rose-500 animate-pulse" />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest text-center">Iniciando LigaRey...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans relative overflow-hidden">
      
      {/* TOAST DE NOTIFICACIÓN EN TIEMPO REAL */}
      {newNotificationToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-[340px] px-4 animate-in slide-in-from-top duration-500">
          <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${newNotificationToast.type === 'beer' ? 'bg-amber-500' : 'bg-green-500'}`}>
              {newNotificationToast.type === 'beer' ? <Beer className="w-6 h-6 text-white" /> : <Hand className="w-6 h-6 text-white" />}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-0.5">¡Nueva propuesta!</p>
              <p className="text-sm font-bold leading-tight"><b>{newNotificationToast.fromName}</b> te ha enviado un {newNotificationToast.type === 'beer' ? 'brindis' : 'saludo'}.</p>
            </div>
            <button onClick={() => setNewNotificationToast(null)} className="p-1 opacity-50"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* CABECERA */}
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
          
          {/* VISTA: BIENVENIDA */}
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-8 bg-stone-50">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-in zoom-in">
                <Crown className="text-white w-16 h-16" />
              </div>
              <div className="space-y-2">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 pb-2 leading-none">LigaRey</h1>
                <p className="text-stone-500 italic font-medium">Encuentra nuevos amigos</p>
              </div>
              <div className="w-full max-w-xs space-y-4 pt-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Crear una cuenta</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold active:scale-95 transition-all uppercase tracking-widest text-xs">Entrar</button>
              </div>
            </div>
          )}

          {/* VISTA: AUTH */}
          {view === 'auth' && (
            <div className="h-full flex flex-col p-6 bg-stone-50 animate-in slide-in-from-right">
              <button onClick={() => setView('welcome')} className="self-start p-2 text-stone-400 mb-6"><ChevronLeft className="w-8 h-8" /></button>
              <div className="max-w-sm w-full mx-auto">
                <h2 className="text-4xl font-black text-stone-900 mb-2 tracking-tighter uppercase leading-none">{authMode === 'login' ? 'Hola!' : 'VIP'}</h2>
                <p className="text-stone-500 mb-8 text-sm">{authMode === 'login' ? 'Entra para ver quién está en la pista.' : 'Regístrate para conocer gente.'}</p>
                {authError && <p className="text-red-500 text-xs font-bold mb-4 bg-red-50 p-3 rounded-xl border border-red-100">{authError}</p>}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 shadow-sm" />
                  <input type="password" required placeholder="Contraseña" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 shadow-sm" />
                  <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold flex justify-center items-center h-14 shadow-lg active:scale-95 transition-all">
                    {isAuthLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? 'ENTRAR' : 'REGISTRARSE')}
                  </button>
                </form>
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-8 text-stone-500 text-xs font-black uppercase tracking-widest">{authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}</button>
              </div>
            </div>
          )}

          {/* VISTA: PERFIL / REGISTRO */}
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
                      {myProfile.photo ? <img src={myProfile.photo} alt="Profile" className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.size <= 400 * 1024) {
                        const reader = new FileReader();
                        reader.onloadend = () => { setMyProfile({...myProfile, photo: reader.result}); };
                        reader.readAsDataURL(file);
                      } else { setPhotoError('Máximo 400KB.'); }
                    }} className="hidden" />
                    <p className={`text-[10px] mt-2 font-bold ${photoError ? 'text-red-500' : 'text-stone-400'}`}>{photoError || 'Sube una foto (Máx 400KB)'}</p>
                  </div>

                  <div className="space-y-4">
                    <input type="text" placeholder="Tu nombre" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none shadow-sm" />
                    <input type="text" placeholder="Frase estrella" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 italic outline-none shadow-sm" />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {INTERESES_COMUNES.slice(0, 15).map(int => (
                      <button key={int} onClick={() => {
                        const interests = myProfile.interests.includes(int)
                          ? myProfile.interests.filter(i => i !== int)
                          : myProfile.interests.length < 5 ? [...myProfile.interests, int] : myProfile.interests;
                        setMyProfile({...myProfile, interests});
                      }} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${myProfile.interests.includes(int) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white text-stone-500'}`}>{int}</button>
                    ))}
                  </div>

                  <div className="pt-6 space-y-4">
                    {saveMessage && <p className="text-green-600 text-center font-bold text-xs bg-green-50 py-2 rounded-lg border border-green-100">{saveMessage}</p>}
                    <button onClick={() => saveProfileData()} disabled={isSavingProfile} className="w-full h-14 bg-stone-900 text-white rounded-2xl font-bold flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all text-xs uppercase tracking-widest">
                      {isSavingProfile ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Guardar Perfil'}
                    </button>
                    <button onClick={handleLogout} className="w-full text-red-500 font-black text-[10px] uppercase tracking-[0.2em] py-2 active:opacity-50">Cerrar Sesión</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-[400px] relative rounded-[2rem] overflow-hidden shadow-2xl border border-stone-200 bg-stone-200 animate-in fade-in">
                  {myProfile.photo ? <img src={myProfile.photo} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-stone-400"><Camera className="w-12 h-12" /></div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"></div>
                  <div className="absolute bottom-0 p-6 text-white w-full">
                    <h2 className="text-3xl font-black tracking-tighter leading-none mb-1">{myProfile.name || 'Tu Nombre'}</h2>
                    <p className="text-rose-300 font-bold mb-3 italic">"{myProfile.phrase || 'Tu frase estrella'}"</p>
                    <div className="flex flex-wrap gap-2">{myProfile.interests.map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[9px] uppercase font-bold">{i}</span>)}</div>
                  </div>
                </div>
              )}
              <button onClick={async () => {
                if (!myProfile.name.trim()) { setPhotoError('Nombre obligatorio.'); return; }
                const ok = await saveProfileData();
                if (ok) setView('discover');
              }} disabled={isSavingProfile} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl flex justify-center items-center gap-2 uppercase tracking-widest active:scale-95 transition-all h-16">
                {isSavingProfile ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : '¡A LA PISTA!'}
              </button>
            </div>
          )}

          {/* VISTA: DISCOVER (LA PISTA) */}
          {view === 'discover' && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative animate-in slide-in-from-bottom">
              
              {/* ANIMACIÓN DE MATCH */}
              {showMatchAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-md animate-in fade-in duration-300">
                  <div className="text-center animate-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-stone-100 mx-auto mb-4">
                      {showMatchAnimation === 'beer' ? <Beer className="w-12 h-12 text-amber-500 fill-current" /> : <Hand className="w-12 h-12 text-green-500 fill-current" />}
                    </div>
                    <h2 className="text-3xl font-black text-stone-800 uppercase tracking-tighter">
                      {showMatchAnimation === 'beer' ? '¡PROPUESTA ENVIADA!' : '¡SALUDO ENVIADO!'}
                    </h2>
                    <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest mt-2">Estamos conectando tu Pase VIP...</p>
                  </div>
                </div>
              )}

              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-stone-200">
                <img src={profiles[currentIndex]?.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover shadow-inner" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent"></div>
                <div className="absolute bottom-0 p-6 text-white w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-4xl font-black tracking-tighter leading-none">{profiles[currentIndex]?.name}</h2>
                    {profiles[currentIndex]?.id?.startsWith('m') && <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest border border-white/20">Ejemplo</span>}
                  </div>
                  <p className="text-rose-300 font-bold mb-4 italic leading-tight">"{profiles[currentIndex]?.phrase || 'Hola!'}"</p>
                  <div className="flex flex-wrap gap-2">
                    {(profiles[currentIndex]?.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 rounded text-[10px] uppercase font-bold tracking-wider">{i}</span>)}
                  </div>
                </div>
              </div>

              <div className="flex justify-center items-center gap-4 py-6">
                <button 
                  onClick={() => handleMatchAction('beer')} 
                  className="w-16 h-16 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-amber-500"
                >
                  <Beer className="w-8 h-8 fill-current" />
                </button>
                <button 
                  onClick={() => setCurrentIndex(prev => (prev + 1) % profiles.length)} 
                  className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-red-50"
                >
                  <X className="w-7 h-7" />
                </button>
                <button 
                  onClick={() => handleMatchAction('hand')} 
                  className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all hover:bg-green-600"
                >
                  <Hand className="w-8 h-8 fill-current" />
                </button>
              </div>
            </div>
          )}

          {/* VISTA: MENSAJES / NOTIFICACIONES */}
          {view === 'messages' && (
            <div className="h-full flex flex-col p-6 bg-stone-50 overflow-y-auto">
              <h2 className="text-3xl font-black text-stone-900 mb-6 uppercase tracking-tighter leading-none">Actividad</h2>
              
              {notifications.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-stone-400 gap-4 opacity-50">
                  <Bell className="w-12 h-12" />
                  <p className="font-bold text-sm uppercase tracking-widest">Sin propuestas aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="bg-white p-4 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 animate-in slide-in-from-bottom">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'beer' ? 'bg-amber-500' : 'bg-green-500'}`}>
                        {notif.type === 'beer' ? <Beer className="w-6 h-6 text-white" /> : <Hand className="w-6 h-6 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-800 leading-tight"><b>{notif.fromName}</b> te ha invitado a {notif.type === 'beer' ? 'una cerveza' : 'saludado'}.</p>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Recibido ahora</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* NAVEGACIÓN INFERIOR */}
        {['discover', 'register', 'messages'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 transition-all ${view === 'discover' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Flame className="w-7 h-7" /></button>
            
            <button onClick={() => setView('messages')} className={`p-2 relative transition-all ${view === 'messages' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}>
              <MessageCircle className="w-7 h-7" />
              {notifications.length > 0 && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* MODAL QR */}
        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-stone-300 hover:text-stone-800"><X className="w-6 h-6" /></button>
              <h3 className="text-2xl font-black text-stone-800 mb-4 tracking-tighter uppercase">Descuento Rey</h3>
              <div className="bg-stone-100 p-4 rounded-3xl inline-block mb-4 shadow-inner border border-stone-200">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-${currentUser?.uid}`} alt="QR" className="w-48 h-48 mix-blend-multiply" />
              </div>
              <p className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">Muestra en barra principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}