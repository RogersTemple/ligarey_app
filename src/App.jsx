import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, X, MessageCircle, User, Flame, Music, 
  ChevronLeft, Send, Sparkles, Camera, Upload, 
  Trash2, Check, ZoomIn, Info, Crown, Hand, Beer, QrCode 
} from 'lucide-react';

// --- CONSTANTES Y MOCKS ---
const INTERESES_COMUNES = [
  "Rock", "Pop", "Indie", "Reggaetón", "Electrónica", "Trap", "Metal",
  "Cerveza fría", "Cócteles", "Vino", "Bailar", "Pogo", "Primera fila",
  "VIP", "Acampada", "Post-concierto", "Hacer fotos", "Charlas profundas",
  "Conocer gente", "Viajar", "Festivales", "Tatuajes", "Moda", "Deporte"
];

const PERFILES_MOCK = [
  {
    id: 'm1',
    name: 'Lucía',
    age: 24,
    photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop',
    lookingFor: 'Alguien que se sepa todas las letras de Arctic Monkeys',
    phrase: 'Viviendo el momento, un concierto a la vez. ✨',
    interests: ['Rock', 'Cerveza fría', 'Festivales'],
  },
  {
    id: 'm2',
    name: 'Carlos',
    age: 27,
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop',
    lookingFor: 'Gente para ir al escenario principal en 1 hora',
    phrase: 'Buscando el mejor pogo de la noche.',
    interests: ['Indie', 'Pogo', 'Electrónica'],
  },
  {
    id: 'm3',
    name: 'Elena',
    age: 22,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop',
    lookingFor: 'Alguien para compartir glitter y baile',
    phrase: 'Si hay techno, ahí me encuentras.',
    interests: ['Electrónica', 'Bailar', 'Moda'],
  }
];

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1544502062-f82887f03d1c?w=400&h=400&fit=crop";

export default function App() {
  // --- ESTADOS ---
  const [view, setView] = useState('welcome');
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState([]); 
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState({});
  const [showMatchAnimation, setShowMatchAnimation] = useState(null); 
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState({ privacy: false, respect: false });
  const [showHelpModal, setShowHelpModal] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (view === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view, activeChatId]);

  // --- REGISTRO ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempPhoto(reader.result);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmCrop = () => {
    setMyProfile(prev => ({ ...prev, photo: tempPhoto }));
    setIsCropping(false);
  };

  const toggleInterest = (interest) => {
    setMyProfile(prev => {
      if (prev.interests.includes(interest)) {
        return { ...prev, interests: prev.interests.filter(i => i !== interest) };
      }
      if (prev.interests.length < 5) {
        return { ...prev, interests: [...prev.interests, interest] };
      }
      return prev;
    });
  };

  // --- MATCH LOGIC ---
  const handleMatch = (type) => {
    const currentProfile = PERFILES_MOCK[currentIndex];
    
    if (!matches.find(m => m.id === currentProfile.id)) {
      setMatches(prev => [...prev, { ...currentProfile, matchType: type }]);
    }
    
    setShowMatchAnimation(type);
    setTimeout(() => {
      setShowMatchAnimation(null);
      setCurrentIndex(prev => (prev < PERFILES_MOCK.length - 1 ? prev + 1 : 0));
    }, 1500);
  };

  const nextProfile = () => {
    setCurrentIndex(prev => (prev < PERFILES_MOCK.length - 1 ? prev + 1 : 0));
  };

  const sendMessage = (text) => {
    if (!text.trim()) return;
    setMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), { sender: 'me', text }]
    }));
  };

  // --- COMPONENTES DE VISTA ---
  const WelcomeView = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-8 animate-in fade-in zoom-in duration-700 bg-stone-50">
      <div className="relative">
        <div className="absolute inset-0 bg-rose-400 blur-3xl opacity-20 animate-pulse"></div>
        <div className="w-32 h-32 bg-gradient-to-tr from-rose-500 to-orange-400 rounded-full flex items-center justify-center shadow-2xl relative z-10 border-4 border-white">
          <Crown className="text-white w-16 h-16" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500 tracking-tight pb-2 leading-tight">LigaRey</h1>
        <p className="text-stone-500 text-lg px-4 font-medium italic">El VIP de los festivales</p>
      </div>
      <button onClick={() => setShowTermsModal(true)} className="w-full max-w-xs py-4 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-bold text-lg shadow-xl active:scale-95 transition-all">
        Crear mi Perfil
      </button>
    </div>
  );

  const RegisterView = () => (
    <div className="h-full flex flex-col p-6 overflow-y-auto pb-24 bg-stone-50">
      {isCropping && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6">
          <img src={tempPhoto} alt="Crop preview" className="w-64 h-64 rounded-full object-cover mb-8 border-4 border-rose-500" />
          <div className="flex gap-4 w-full max-w-xs">
            <button onClick={() => setIsCropping(false)} className="flex-1 py-4 bg-white/10 text-white rounded-2xl">Cancelar</button>
            <button onClick={confirmCrop} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold">Aceptar</button>
          </div>
        </div>
      )}

      <div className="flex justify-center mb-6 bg-stone-200 rounded-full p-1 mt-2">
        <button onClick={() => setProfileMode('edit')} className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${profileMode === 'edit' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>Editar Datos</button>
        <button onClick={() => setProfileMode('preview')} className={`flex-1 py-2 rounded-full font-bold text-sm transition-all ${profileMode === 'preview' ? 'bg-white shadow text-stone-800' : 'text-stone-500'}`}>Vista Previa</button>
      </div>

      {profileMode === 'edit' ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center">
            <div onClick={() => fileInputRef.current.click()} className="w-40 h-40 rounded-full border-4 border-white shadow-xl bg-stone-200 overflow-hidden flex items-center justify-center cursor-pointer">
              {myProfile.photo ? <img src={myProfile.photo} alt="Profile" className="w-full h-full object-cover" /> : <Camera className="text-stone-400 w-8 h-8" />}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </div>
          <input type="text" placeholder="Nombre" value={myProfile.name} onChange={e => setMyProfile({...myProfile, name: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 shadow-sm focus:outline-none focus:border-rose-400" />
          <input type="text" placeholder="Frase estrella" value={myProfile.phrase} onChange={e => setMyProfile({...myProfile, phrase: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 shadow-sm italic focus:outline-none focus:border-rose-400" />
          <textarea placeholder="¿A quién buscas?" value={myProfile.lookingFor} onChange={e => setMyProfile({...myProfile, lookingFor: e.target.value})} className="w-full p-4 rounded-2xl border border-stone-200 shadow-sm focus:outline-none focus:border-rose-400" rows="2" />
          
          <div className="flex flex-wrap gap-2">
            {INTERESES_COMUNES.slice(0, 12).map(int => (
              <button key={int} onClick={() => toggleInterest(int)} className={`px-3 py-2 rounded-full text-xs font-bold border transition-all ${myProfile.interests.includes(int) ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white text-stone-500'}`}>{int}</button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-stone-200">
            <button onClick={() => setShowHelpModal(true)} className="flex items-center justify-center gap-2 w-full py-4 text-stone-500 font-bold bg-white rounded-2xl shadow-sm border border-stone-200 active:scale-95 transition-all hover:bg-stone-50">
              <Info className="w-5 h-5" /> Ayuda e Instrucciones
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-[450px] relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-stone-200 group">
          {myProfile.photo ? (
            <img src={myProfile.photo} alt="Profile Preview" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-stone-200 flex flex-col items-center justify-center text-stone-400">
              <Camera className="w-12 h-12 mb-2" />
              <p className="font-bold">Sube una foto</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          
          <div className="absolute bottom-0 p-6 text-white w-full">
            <h2 className="text-4xl font-black">{myProfile.name || 'Tu Nombre'}</h2>
            <p className="text-rose-300 font-bold mb-4">"{myProfile.phrase || 'Tu frase estrella'}"</p>
            <div className="flex flex-wrap gap-2">
              {myProfile.interests.map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] uppercase font-bold">{i}</span>)}
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setView('discover')} className="w-full py-5 mt-8 rounded-full bg-rose-500 text-white font-bold text-xl shadow-lg active:scale-95 transition-all">¡A LA PISTA!</button>
    </div>
  );

  const DiscoverView = () => {
    const profile = PERFILES_MOCK[currentIndex];
    return (
      <div className="h-full flex flex-col p-4 relative bg-stone-100">
        {showMatchAnimation && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="text-center scale-110">
              <h2 className={`text-6xl font-black mb-4 italic ${showMatchAnimation === 'beer' ? 'text-amber-500' : 'text-green-500'}`}>
                {showMatchAnimation === 'beer' ? '¡BIRRA!' : '¡HOLA!'}
              </h2>
              <div className="flex gap-4 justify-center items-center">
                <img src={myProfile.photo || DEFAULT_AVATAR} alt="Me" className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-xl rotate-[-10deg]" />
                {showMatchAnimation === 'beer' ? <Beer className="w-12 h-12 text-amber-500" /> : <Hand className="w-12 h-12 text-green-500" />}
                <img src={profile.photo} alt="Match" className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-xl rotate-[10deg]" />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white border border-stone-200">
          <img src={profile.photo} alt="Current Profile" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          <div className="absolute bottom-0 p-6 text-white w-full">
            <h2 className="text-4xl font-black">{profile.name}, {profile.age}</h2>
            <p className="text-rose-300 font-bold mb-4">"{profile.phrase}"</p>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(i => <span key={i} className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] uppercase font-bold">{i}</span>)}
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-4 py-6">
          <button onClick={() => handleMatch('beer')} className="w-16 h-16 rounded-full bg-amber-400 text-white flex items-center justify-center active:scale-90 transition-all shadow-lg hover:bg-amber-500">
            <Beer className="w-8 h-8 fill-current" />
          </button>
          <button onClick={nextProfile} className="w-14 h-14 rounded-full bg-white border-2 border-red-500 text-red-500 flex items-center justify-center active:scale-90 transition-all shadow-lg hover:bg-red-50">
            <X className="w-7 h-7" />
          </button>
          <button onClick={() => handleMatch('hand')} className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center active:scale-90 transition-all shadow-lg hover:bg-green-600">
            <Hand className="w-8 h-8 fill-current" />
          </button>
        </div>
      </div>
    );
  };

  const MatchesView = () => (
    <div className="h-full flex flex-col p-6 bg-stone-50">
      <h2 className="text-4xl font-black text-stone-800 mb-6">Matches</h2>
      <div className="grid grid-cols-1 gap-4 overflow-y-auto">
        {matches.length === 0 ? (
           <div className="text-center text-stone-400 mt-10">
             <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
             <p>Aún no hay matches. ¡Sigue explorando!</p>
           </div>
        ) : matches.map(m => (
          <div key={m.id} onClick={() => { setActiveChatId(m.id); setView('chat'); }} className="flex items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-stone-100 active:scale-95 transition-all cursor-pointer hover:shadow-md">
            <div className="relative">
              <img src={m.photo} alt={m.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
              <div className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white ${m.matchType === 'beer' ? 'bg-amber-400' : 'bg-green-500'}`}>
                {m.matchType === 'beer' ? <Beer className="w-3 h-3 text-white" /> : <Hand className="w-3 h-3 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-stone-800">{m.name}</h3>
              <p className="text-xs text-stone-400 font-bold uppercase tracking-wide">{m.matchType === 'beer' ? 'Le has ofrecido una birra' : 'Le has saludado'}</p>
            </div>
            <ChevronLeft className="rotate-180 text-stone-300" />
          </div>
        ))}
      </div>
    </div>
  );

  const ChatView = () => {
    const match = matches.find(m => m.id === activeChatId);
    const [text, setText] = useState('');
    
    // Safety fallback if no match is selected but view is accessed
    if (!match) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-stone-50">
          <p className="text-stone-500 mb-4">Chat no encontrado</p>
          <button onClick={() => setView('matches')} className="px-4 py-2 bg-rose-500 text-white rounded-full">Volver</button>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-stone-50">
        <div className="p-4 bg-white border-b flex items-center gap-4 shadow-sm z-10">
          <button onClick={() => setView('matches')} className="active:scale-90 transition-transform"><ChevronLeft className="w-6 h-6 text-stone-400" /></button>
          <img src={match.photo} alt={match.name} className="w-10 h-10 rounded-full object-cover" />
          <h3 className="font-bold text-stone-800">{match.name}</h3>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex flex-col items-center py-4">
            <div className={`px-6 py-3 rounded-2xl flex items-center gap-3 border shadow-sm animate-in slide-in-from-top duration-500 ${match.matchType === 'beer' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
              {match.matchType === 'beer' ? <Beer className="w-5 h-5" /> : <Hand className="w-5 h-5" />}
              <p className="text-xs font-bold uppercase tracking-tight">
                {match.matchType === 'beer' ? `¡Le has propuesto una birra a ${match.name}!` : `¡Has saludado a ${match.name}!`}
              </p>
            </div>
          </div>
          
          {(messages[activeChatId] || []).map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-3xl max-w-[80%] text-sm shadow-sm ${msg.sender === 'me' ? 'bg-rose-500 text-white rounded-tr-none' : 'bg-white text-stone-700 border border-stone-200 rounded-tl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        
        <form onSubmit={e => { e.preventDefault(); sendMessage(text); setText(''); }} className="p-4 bg-white flex gap-2 border-t">
          <input 
            value={text} 
            onChange={e => setText(e.target.value)} 
            placeholder="Escribe algo..." 
            className="flex-1 bg-stone-100 rounded-full px-6 py-3 focus:outline-none focus:bg-white border border-transparent focus:border-rose-300 transition-all" 
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className="w-12 h-12 bg-rose-500 disabled:bg-rose-300 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-900 sm:bg-stone-200 flex justify-center items-center selection:bg-rose-500/20">
      <div className="w-full max-w-md bg-white h-screen sm:h-[850px] sm:rounded-[3rem] sm:border-[8px] sm:border-stone-800 flex flex-col relative overflow-hidden shadow-2xl">
        {view !== 'welcome' && (
          <div className="bg-white border-b py-3 px-4 flex items-center justify-between z-20 relative">
            
            {/* Logo alineado a la izquierda */}
            <div className="flex items-center">
              <Crown className="w-5 h-5 text-rose-500 mr-2" />
              <h1 className="text-xl font-black text-rose-500 tracking-tighter">LIGAREY</h1>
            </div>

            {/* Nuevo botón QR VIP global */}
            <button 
              onClick={() => setShowQRModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-rose-100 to-orange-100 text-rose-600 rounded-full hover:shadow-md transition-all flex items-center gap-1.5 z-10 border border-rose-200 active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span className="text-[10px] font-black tracking-wide whitespace-nowrap">DESCUENTO REY</span>
            </button>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          {view === 'welcome' && <WelcomeView />}
          {view === 'register' && <RegisterView />}
          {view === 'discover' && <DiscoverView />}
          {view === 'matches' && <MatchesView />}
          {view === 'chat' && <ChatView />}
        </div>

        {['discover', 'matches'].includes(view) && (
          <div className="bg-white/80 backdrop-blur-md border-t p-4 flex justify-around pb-6 shrink-0 z-20">
            <button onClick={() => setView('discover')} className={`p-2 transition-colors ${view === 'discover' ? 'text-rose-500' : 'text-stone-400 hover:text-stone-600'}`}>
              <Flame className="w-7 h-7" />
            </button>
            <button onClick={() => setView('matches')} className={`p-2 relative transition-colors ${view === 'matches' ? 'text-rose-500' : 'text-stone-400 hover:text-stone-600'}`}>
              <MessageCircle className="w-7 h-7" />
              {matches.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>}
            </button>
            <button onClick={() => setView('register')} className={`p-2 transition-colors ${view === 'register' ? 'text-rose-500' : 'text-stone-400 hover:text-stone-600'}`}>
              <User className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* Modal del Código QR */}
        {showQRModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl animate-in zoom-in duration-300">
              <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
              <div className="mx-auto w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-stone-800 mb-2">Tu VIP Pass</h3>
              <p className="text-stone-500 mb-6 text-sm">Muestra este código al camarero para obtener <strong className="text-rose-500 font-bold">1€ de descuento</strong> en copas, cervezas en botella y refrescos.</p>
              <div className="bg-stone-100 p-4 rounded-3xl inline-block mb-4 shadow-inner border border-stone-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LIGAREY-PROMO-${myProfile.name || 'USER'}`} 
                  alt="QR Descuento" 
                  className="w-48 h-48 rounded-xl mix-blend-multiply" 
                />
              </div>
              <p className="text-xs text-stone-400 uppercase tracking-widest font-bold">Válido toda la noche</p>
            </div>
          </div>
        )}

        {/* Modal de Términos y Condiciones */}
        {showTermsModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full relative shadow-2xl animate-in zoom-in duration-300">
              <button onClick={() => setShowTermsModal(false)} className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
              <div className="mx-auto w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-stone-800 mb-4 text-center">Antes de entrar...</h3>
              
              <div className="space-y-4 text-sm text-stone-600 mb-6">
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded-xl hover:bg-stone-50 transition-colors">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-5 h-5 accent-rose-500 shrink-0" 
                    checked={termsAccepted.privacy} 
                    onChange={e => setTermsAccepted({...termsAccepted, privacy: e.target.checked})} 
                  />
                  <span>Acepto la <strong>Política de Privacidad</strong> y el tratamiento de mis datos para conectar con otras personas dentro del festival.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded-xl hover:bg-stone-50 transition-colors">
                  <input 
                    type="checkbox" 
                    className="mt-1 w-5 h-5 accent-rose-500 shrink-0" 
                    checked={termsAccepted.respect} 
                    onChange={e => setTermsAccepted({...termsAccepted, respect: e.target.checked})} 
                  />
                  <span>Me comprometo a mantener siempre el <strong>respeto y la buena educación</strong> con los demás usuarios de la comunidad.</span>
                </label>
              </div>

              <button 
                disabled={!termsAccepted.privacy || !termsAccepted.respect}
                onClick={() => { setShowTermsModal(false); setView('register'); }} 
                className="w-full py-4 rounded-full bg-rose-500 disabled:bg-stone-300 disabled:text-stone-500 text-white font-bold text-lg shadow-xl active:scale-95 transition-all"
              >
                Aceptar y Entrar
              </button>
            </div>
          </div>
        )}

        {/* Modal de Ayuda */}
        {showHelpModal && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] p-6 max-w-sm w-full relative shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2 mb-6">
                <Info className="w-6 h-6 text-rose-500" />
                <h3 className="text-xl font-black text-stone-800">Ayuda e Instrucciones</h3>
              </div>
              
              <div className="space-y-4 text-sm text-stone-600">
                 <div className="bg-stone-50 p-4 rounded-2xl">
                   <p className="mb-2"><strong>🔥 Descubrir Perfiles:</strong></p>
                   <ul className="space-y-2 ml-1">
                     <li><Beer className="w-4 h-4 inline text-amber-500 mr-1" /> Botón amarillo: Proponer una birra.</li>
                     <li><Hand className="w-4 h-4 inline text-green-500 mr-1" /> Botón verde: Enviar un saludo.</li>
                     <li><X className="w-4 h-4 inline text-red-500 mr-1" /> Botón cruz: Pasar al siguiente.</li>
                   </ul>
                 </div>
                 
                 <div className="bg-stone-50 p-4 rounded-2xl">
                   <p><strong>💬 Tus Matches:</strong> Si haces match enviando un saludo o invitando a una birra, podrás chatear con esa persona desde la pestaña central.</p>
                 </div>
                 
                 <div className="bg-stone-50 p-4 rounded-2xl">
                   <p><strong>🎟️ Descuento Rey:</strong> Toca el botón <b>DESCUENTO REY</b> arriba a la derecha en cualquier momento para mostrar tu código QR en barra y obtener 1€ de descuento en tus bebidas.</p>
                 </div>
              </div>

              <button onClick={() => setShowHelpModal(false)} className="w-full mt-6 py-4 rounded-full bg-stone-200 text-stone-800 font-bold text-lg active:scale-95 hover:bg-stone-300 transition-all">
                ¡Entendido!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}