import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode,
  Mail, Lock, ArrowRight, KeyRound, LogOut, AlertCircle, Bell, BellOff, Settings, Eraser, UserX
} from 'lucide-react';

// --- CONFIGURAZIONE DE FIREBASE ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  setPersistence, 
  browserLocalPersistence,
  deleteUser // Importato per eliminare l'account
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
  query,
  where,
  orderBy
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
  { id: 'm1', name: 'Lucía (Ejemplo)', age: 24, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop', phrase: 'Viviendo el momento, un concierto a la vez. ✨', interests: ['Rock', 'Cerveza fría'] }
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

  const [myProfile, setMyProfile] = useState({ 
    name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true 
  });
  
  const [photoError, setPhotoError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState(''); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Nuovo stato per conferma eliminazione

  const [profiles, setProfiles] = useState(PERFILES_MOCK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchAnimation, setShowMatchAnimation] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [profileMode, setProfileMode] = useState('edit');

  const [notifications, setNotifications] = useState([]);
  const [newNotificationToast, setNewNotificationToast] = useState(null);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  const [activeChats, setActiveChats] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null); 
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');

  const sessionStart = useRef(new Date().toISOString());
  const notifiedIds = useRef(new Set());
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, view]);

  useEffect(() => {
    if (view === 'notifications') setHasUnreadNotifs(false);
    if (view === 'messages') setHasUnreadMessages(false);
  }, [view]);

  // --- LÓGICA DE INICIO ---
  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 6000);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setMyProfile({ 
              name: data.name || '', 
              photo: data.photo || null, 
              phrase: data.phrase || '', 
              lookingFor: data.lookingFor || '', 
              interests: data.interests || [],
              notificationsEnabled: data.notificationsEnabled !== undefined ? data.notificationsEnabled : true
            });
            if (!data.name || !data.photo) {
              setView('register');
            } else if (view === 'welcome' || view === 'auth') {
              setView('discover');
            }
          } else {
            setView('register');
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

  // --- ESCUCHADORES ---
  useEffect(() => {
    if (!currentUser) return;
    const qMatches = query(collection(db, 'matches'));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          const id = change.doc.id;
          if (data.to === currentUser.uid && data.timestamp > sessionStart.current && !notifiedIds.current.has(id)) {
            notifiedIds.current.add(id);
            setNotifications(prev => [{ id, ...data, isMessage: false }, ...prev]);
            if (view !== 'notifications') setHasUnreadNotifs(true);
            if (myProfile.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
              new Notification(`¡Propuesta de ${data.fromName}!`);
            }
          }
        }
      });
    });
    return () => unsubMatches();
  }, [currentUser, view, myProfile.notificationsEnabled]);

  // --- CARGAR PISTA ---
  useEffect(() => {
    if (view === 'discover' && currentUser) {
      const fetchDiscover = async () => {
        try {
          const usersSnap = await getDocs(collection(db, 'usuarios'));
          const list = [];
          usersSnap.forEach(d => { 
            if (d.id !== currentUser.uid && d.data().name) {
              list.push({ id: d.id, ...d.data() }); 
            }
          });
          setProfiles(list.length > 0 ? list : PERFILES_MOCK);
        } catch (e) { console.error(e); }
      };
      fetchDiscover();
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
        const res = await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
        await setDoc(doc(db, 'usuarios', res.user.uid), { 
          email: authForm.email, 
          fechaRegistro: new Date().toISOString(), 
          notificationsEnabled: true,
          interests: []
        });
        setView('register');
      }
    } catch (error) {
      console.error(error.code);
      switch(error.code) {
        case 'auth/weak-password': setAuthError('La password deve avere almeno 6 caratteri.'); break;
        case 'auth/email-already-in-use': setAuthError('Questa email è già registrata.'); break;
        case 'auth/invalid-credential': setAuthError('Credenziali non valide.'); break;
        default: setAuthError('Errore di connessione. Riprova.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const toggleInterestLocal = (int) => {
    setMyProfile(prev => {
      const current = prev.interests || [];
      const newList = current.includes(int) ? current.filter(i => i !== int) : [...current, int].slice(0, 5);
      return { ...prev, interests: newList };
    });
  };

  const saveProfileData = async () => {
    if (!currentUser) return false;
    
    if (!myProfile.name.trim() || !myProfile.photo || !myProfile.phrase.trim() || myProfile.interests.length === 0) {
      setPhotoError('Tutti i campi (Foto, Nome, Frase, Interessi) sono obbligatori!');
      return false;
    }

    setIsSavingProfile(true);
    setPhotoError('');
    try {
      await setDoc(doc(db, 'usuarios', currentUser.uid), { ...myProfile }, { merge: true });
      setSaveMessage('¡Profilo salvato!');
      setTimeout(() => setSaveMessage(''), 2000);
      return true;
    } catch (e) {
      setPhotoError('Errore durante il salvataggio. La foto potrebbe essere troppo grande.');
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGoToPista = async () => {
    const success = await saveProfileData();
    if (success) {
      setView('discover');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true });
    setView('welcome');
  };

  // --- ELIMINAZIONE ACCOUNT ---
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    setIsAuthLoading(true);
    try {
      // 1. Eliminiamo i dati da Firestore
      await deleteDoc(doc(db, 'usuarios', currentUser.uid));
      
      // 2. Eliminiamo l'utente dall'autenticazione
      const user = auth.currentUser;
      await deleteUser(user);
      
      // 3. Pulizia finale
      setCurrentUser(null);
      setMyProfile({ name: '', photo: null, phrase: '', lookingFor: '', interests: [], notificationsEnabled: true });
      setShowDeleteConfirm(false);
      setView('welcome');
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        setAuthError("Per eliminare l'account devi aver effettuato l'accesso di recente. Esci e rientra prima di riprovare.");
      } else {
        setAuthError("Errore durante l'eliminazione dell'account.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (isInitializing) return <div className="min-h-screen bg-stone-900 flex items-center justify-center"><Crown className="w-16 h-16 text-rose-500 animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center font-sans overflow-hidden">
      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* CABECERA */}
        {view !== 'welcome' && view !== 'auth' && view !== 'chat' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2"><Crown className="w-5 h-5 text-rose-500" /><h1 className="text-xl font-black text-rose-500 tracking-tighter uppercase">LigaRey</h1></div>
            <button onClick={() => setShowQRModal(true)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black border border-rose-100 flex items-center gap-1"><QrCode className="w-3 h-3" /> DESCUENTO REY</button>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          
          {/* WELCOME */}
          {view === 'welcome' && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 bg-stone-50">
              <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl border-4 border-white animate-bounce"><Crown className="text-white w-16 h-16" /></div>
              <h1 className="text-5xl font-black text-stone-900 tracking-tighter leading-none">LigaRey</h1>
              <div className="w-full max-w-xs space-y-4 pt-4">
                <button onClick={() => { setAuthMode('register'); setView('auth'); }} className="w-full py-4 rounded-full bg-rose-500 text-white font-bold shadow-xl active:scale-95 transition-all">Empezar ahora</button>
                <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="w-full py-4 rounded-full bg-white text-stone-800 border border-stone-200 font-bold active:scale-95 transition-all">Entrar</button>
              </div>
            </div>
          )}

          {/* AUTH */}
          {view === 'auth' && (
            <div className="h-full p-6 bg-stone-50">
              <button onClick={() => setView('welcome')} className="p-2 text-stone-400 mb-6"><ChevronLeft className="w-8 h-8" /></button>
              <h2 className="text-4xl font-black text-stone-900 mb-8 tracking-tighter uppercase">{authMode === 'login' ? 'Bentornato' : 'Nuovo VIP'}</h2>
              {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2 animate-in slide-in-from-top"><AlertCircle className="w-4 h-4" /> {authError}</div>}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <input type="email" required placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors" />
                <input type="password" required placeholder="Password" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-500 transition-colors" />
                <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-stone-900 text-white rounded-full font-bold h-14 shadow-lg active:scale-95 transition-all flex justify-center items-center">
                  {isAuthLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : (authMode === 'login' ? 'ENTRA' : 'REGISTRATI')}
                </button>
              </form>
              <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-stone-500 text-xs font-bold uppercase tracking-widest">{authMode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Entra'}</button>
            </div>
          )}

          {/* REGISTER / SETTINGS */}
          {view === 'register' && (
            <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
              <h2 className="text-2xl font-black text-center mb-6 uppercase tracking-tighter">Il tuo Profilo</h2>
              
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <div onClick={() => fileInputRef.current.click()} className="w-32 h-32 rounded-full border-4 border-stone-800 shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer hover:border-rose-400 transition-all">
                    {myProfile.photo ? <img src={myProfile.photo} className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
                  </div>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={(e) => {
                    const reader = new FileReader();
                    reader.onloadend = () => setMyProfile({...myProfile, photo: reader.result});
                    if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
                  }} className="hidden" />
                  {photoError && <p className="text-red-500 text-[10px] font-bold mt-2 text-center">{photoError}</p>}
                </div>
                
                <input type="text" placeholder="Nome (Obbligatorio)" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none focus:border-rose-400 shadow-sm" />
                <textarea placeholder="Tua frase festivalera (Obbligatorio)" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 outline-none h-20 shadow-sm" />
                
                <div className="flex flex-wrap gap-2">
                  {INTERESES_COMUNES.slice(0, 15).map(int => (
                    <button key={int} onClick={() => toggleInterestLocal(int)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${myProfile.interests?.includes(int) ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white text-stone-500'}`}>{int}</button>
                  ))}
                </div>

                <div className="pt-6 space-y-4">
                  {saveMessage && <p className="text-green-600 text-center font-bold text-xs animate-bounce">{saveMessage}</p>}
                  <button onClick={handleGoToPista} disabled={isSavingProfile} className="w-full py-5 rounded-full bg-rose-500 text-white font-black text-lg shadow-xl uppercase h-16 active:scale-95 transition-all flex justify-center items-center gap-2">
                    {isSavingProfile ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : '¡A LA PISTA!'}
                  </button>
                  
                  <div className="h-px bg-stone-200 my-4"></div>
                  
                  {/* AZIONI ACCOUNT */}
                  <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-stone-500 font-bold text-xs uppercase tracking-widest py-2 hover:text-stone-800 transition-colors">
                    <LogOut className="w-4 h-4" /> Chiudi Sessione
                  </button>
                  
                  <button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    className="w-full flex items-center justify-center gap-2 text-red-400 font-bold text-xs uppercase tracking-widest py-2 hover:text-red-600 transition-colors mt-2"
                  >
                    <UserX className="w-4 h-4" /> Elimina Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ... altre viste come DISCOVER, CHAT, ecc. ... */}
          {view === 'discover' && (
            <div className="h-full flex flex-col p-4 bg-stone-100 relative">
              <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-stone-200">
                {profiles[currentIndex] ? (
                  <>
                    <img src={profiles[currentIndex]?.photo || DEFAULT_AVATAR} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 p-6 text-white w-full">
                      <h2 className="text-4xl font-black tracking-tighter leading-none mb-1">{profiles[currentIndex]?.name}</h2>
                      <p className="text-rose-300 font-bold mb-4 italic leading-tight">"{profiles[currentIndex]?.phrase || 'Vente conmigo!'}"</p>
                      <div className="flex flex-wrap gap-2">{(profiles[currentIndex]?.interests || []).map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] uppercase font-bold tracking-widest">{i}</span>)}</div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-400 p-8 text-center font-bold italic">Ya conoces a todos.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR */}
        {['discover', 'register', 'messages', 'notifications'].includes(view) && (
          <div className="bg-white border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 transition-all ${view === 'discover' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><Flame className="w-7 h-7" /></button>
            <button onClick={() => setView('register')} className={`p-2 transition-all ${view === 'register' ? 'text-rose-500 scale-110' : 'text-stone-300'}`}><User className="w-7 h-7" /></button>
          </div>
        )}

        {/* MODAL CONFERMA ELIMINAZIONE */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in">
              <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-stone-800 mb-2 tracking-tighter uppercase">Sei sicuro?</h3>
              <p className="text-stone-500 mb-8 text-sm italic">Questa azione è irreversibile. Tutti i tuoi dati, match e messaggi verranno cancellati per sempre.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isAuthLoading}
                  className="w-full py-4 rounded-full bg-red-500 text-white font-bold text-lg shadow-xl active:scale-95 transition-all flex justify-center items-center"
                >
                  {isAuthLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'SÌ, ELIMINA TUTTO'}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-4 rounded-full bg-stone-100 text-stone-800 font-bold text-lg active:scale-95 transition-all"
                >
                  ANNULLA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal QR ... */}
      </div>
    </div>
  );
}