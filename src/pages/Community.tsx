import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Plus, Search, MessageCircle, Clock, ChevronRight, Send, ArrowLeft, Loader2, Trash2, Pin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import {
    getTopics,
    createTopic,
    deleteTopic,
    getComments,
    addComment,
    togglePinTopic,
    type CommunityTopic,
    type CommunityComment
} from '../services/communityService';
import { checkPropertyAdmin } from '../services/propertyService';
import { toast } from 'sonner';

const Community = () => {
    const { propertyId } = useParams();
    const { strings } = useLanguage();
    const { user } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingTopic, setIsAddingTopic] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<CommunityTopic | null>(null);
    const [newTopic, setNewTopic] = useState({ title: '', content: '' });
    const [newComment, setNewComment] = useState('');

    const [topics, setTopics] = useState<CommunityTopic[]>([]);
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [loadingTopics, setLoadingTopics] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [posting, setPosting] = useState(false);
    const [commenting, setCommenting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const c = strings.community;

    // ─── Load Admin status ─────────────────────────
    useEffect(() => {
        if (!propertyId || !user) return;
        checkPropertyAdmin(propertyId, user.uid).then(setIsAdmin);
    }, [propertyId, user]);

    // ─── Load Topics ─────────────────────────────
    useEffect(() => {
        if (!propertyId) return;
        loadTopics();
    }, [propertyId]);

    const loadTopics = async () => {
        if (!propertyId) return;
        setLoadingTopics(true);
        const data = await getTopics(propertyId);
        setTopics(data);
        setLoadingTopics(false);
    };

    // ─── Load Comments for selected topic ────────
    const loadComments = async (topicId: string) => {
        setLoadingComments(true);
        const data = await getComments(topicId);
        setComments(data);
        setLoadingComments(false);
    };

    const handleSelectTopic = (topic: CommunityTopic) => {
        setSelectedTopic(topic);
        loadComments(topic.id);
    };

    // ─── Create Topic ────────────────────────────
    const handleCreateTopic = async () => {
        if (!newTopic.title.trim() || !newTopic.content.trim() || !propertyId || !user) return;

        setPosting(true);
        const result = await createTopic(propertyId, newTopic.title, newTopic.content, user);
        setPosting(false);

        if (result.success) {
            setNewTopic({ title: '', content: '' });
            setIsAddingTopic(false);
            await loadTopics();
            toast.success('Tema publicado');
        } else {
            toast.error('Error al publicar');
        }
    };

    // ─── Delete Topic ────────────────────────────
    const handleDeleteTopic = async (topicId: string) => {
        const result = await deleteTopic(topicId);
        if (result.success) {
            setSelectedTopic(null);
            await loadTopics();
            toast.success('Tema eliminado');
        } else {
            toast.error('Error al eliminar');
        }
    };

    // ─── Toggle Pin ─────────────────────────────
    const handleTogglePin = async (e: React.MouseEvent, topic: CommunityTopic) => {
        e.stopPropagation();
        const result = await togglePinTopic(topic.id, topic.pinned);
        if (result.success) {
            await loadTopics();
            if (selectedTopic?.id === topic.id) {
                setSelectedTopic({ ...topic, pinned: !topic.pinned });
            }
            toast.success(topic.pinned ? c.unpin : c.pin);
        }
    };

    // ─── Add Comment ─────────────────────────────
    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedTopic || !user) return;

        setCommenting(true);
        const result = await addComment(selectedTopic.id, newComment, user);
        setCommenting(false);

        if (result.success) {
            setNewComment('');
            await loadComments(selectedTopic.id);
            // Update the topic's commentsCount locally
            setSelectedTopic(prev => prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null);
        } else {
            toast.error('Error al comentar');
        }
    };

    const filteredTopics = topics.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date: Date) =>
        new Date(date).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    // ─── Topic Detail View ──────────────────────
    if (selectedTopic) {
        return (
            <div className="p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                    onClick={() => { setSelectedTopic(null); setComments([]); }}
                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-lof-600 font-medium transition-colors"
                >
                    <ArrowLeft size={20} />
                    {c.backToTopics}
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 md:p-8 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <Avatar src={selectedTopic.userPhoto} name={selectedTopic.userName} size="md" />
                                <div>
                                    <p className="font-bold text-slate-900">{selectedTopic.userName}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock size={12} />
                                        {formatDate(selectedTopic.createdAt)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedTopic.pinned && (
                                    <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                        <Pin size={12} />
                                        {c.pinned}
                                    </span>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={(e) => handleTogglePin(e, selectedTopic)}
                                        className={`p-2 rounded-xl transition-colors ${selectedTopic.pinned ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                                        title={selectedTopic.pinned ? c.unpin : c.pin}
                                    >
                                        <Pin size={18} />
                                    </button>
                                )}
                                {(user?.uid === selectedTopic.userId || isAdmin) && (
                                    <button
                                        onClick={() => handleDeleteTopic(selectedTopic.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                        title="Eliminar tema"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-4">{selectedTopic.title}</h2>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedTopic.content}</p>
                    </div>

                    <div className="bg-slate-50 p-6 md:p-8">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <MessageCircle size={20} className="text-lof-600" />
                            {c.comments} ({selectedTopic.commentsCount})
                        </h3>

                        {loadingComments ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 size={28} className="animate-spin text-lof-600" />
                            </div>
                        ) : (
                            <div className="space-y-6 mb-8">
                                {comments.map(comment => (
                                    <div key={comment.id} className="flex gap-4">
                                        <Avatar src={comment.userPhoto} name={comment.userName} size="sm" />
                                        <div className="flex-1">
                                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="font-bold text-sm text-slate-900">{comment.userName}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{formatDate(comment.createdAt)}</p>
                                                </div>
                                                <p className="text-sm text-slate-600">{comment.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {comments.length === 0 && (
                                    <p className="text-sm text-slate-400 text-center py-4">No hay comentarios aún.</p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <Avatar src={user?.photoURL} name={user?.displayName || 'U'} size="sm" />
                            <div className="flex-1 relative">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={c.writeComment}
                                    className="w-full bg-white border border-slate-200 rounded-2xl p-4 pr-12 text-sm focus:ring-2 focus:ring-lof-500 focus:border-lof-500 outline-none transition-all resize-none shadow-sm"
                                    rows={2}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || commenting}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-lof-600 text-white rounded-xl hover:bg-lof-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {commenting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Topics List View ────────────────────────
    return (
        <div className="p-4 md:p-6 animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                    <div className="bg-lof-600 p-2 rounded-2xl text-white">
                        <MessageSquare size={28} />
                    </div>
                    {c.title}
                </h1>
                <p className="text-slate-500 font-medium">{c.subtitle}</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder={c.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-lof-500 focus:border-lof-500 outline-none transition-all shadow-sm font-medium"
                    />
                </div>
                <button
                    onClick={() => setIsAddingTopic(true)}
                    className="flex items-center justify-center gap-2 bg-lof-600 hover:bg-lof-700 text-white px-6 py-3.5 rounded-2xl font-bold transition-all shadow-lg shadow-lof-600/20 active:scale-95"
                >
                    <Plus size={20} />
                    {c.newTopic}
                </button>
            </div>

            {isAddingTopic && (
                <div className="mb-8 bg-white p-6 rounded-3xl border-2 border-lof-100 shadow-xl animate-in zoom-in-95 duration-200">
                    <input
                        type="text"
                        placeholder={c.topicTitlePlaceholder}
                        value={newTopic.title}
                        onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                        className="w-full mb-4 text-xl font-bold bg-transparent border-b border-slate-200 pb-3 focus:border-lof-500 outline-none placeholder:text-slate-300 transition-colors"
                    />
                    <textarea
                        placeholder={c.topicContentPlaceholder}
                        value={newTopic.content}
                        onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
                        className="w-full min-h-[120px] bg-slate-50 rounded-2xl p-4 border border-slate-100 focus:border-lof-300 outline-none transition-all resize-none mb-4"
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => { setIsAddingTopic(false); setNewTopic({ title: '', content: '' }); }}
                            className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            {strings.common.cancel}
                        </button>
                        <button
                            onClick={handleCreateTopic}
                            disabled={!newTopic.title.trim() || !newTopic.content.trim() || posting}
                            className="px-8 py-2.5 bg-lof-600 text-white font-bold rounded-xl hover:bg-lof-700 disabled:opacity-50 transition-all shadow-md active:scale-95 flex items-center gap-2"
                        >
                            {posting && <Loader2 size={16} className="animate-spin" />}
                            {c.btnPost}
                        </button>
                    </div>
                </div>
            )}

            {loadingTopics ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-lof-600" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredTopics.length > 0 ? (
                        filteredTopics.map((topic) => (
                            <div
                                key={topic.id}
                                onClick={() => handleSelectTopic(topic)}
                                className={`group bg-white p-6 rounded-3xl border hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${topic.pinned ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200 hover:border-lof-300'
                                    }`}
                            >
                                <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors ${topic.pinned ? 'bg-amber-400' : 'bg-slate-100 group-hover:bg-lof-600'
                                    }`} />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar src={topic.userPhoto} name={topic.userName} size="sm" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{topic.userName}</p>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{formatDate(topic.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {topic.pinned && (
                                            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                <Pin size={10} />
                                                {c.pinned}
                                            </span>
                                        )}
                                        {isAdmin && (
                                            <button
                                                onClick={(e) => handleTogglePin(e, topic)}
                                                className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${topic.pinned ? 'text-amber-500 hover:bg-amber-100' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                                    }`}
                                                title={topic.pinned ? c.unpin : c.pin}
                                            >
                                                <Pin size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-lof-700 transition-colors mb-2">{topic.title}</h3>
                                <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">{topic.content}</p>

                                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-lof-600 transition-colors">
                                        <MessageCircle size={16} />
                                        <span className="text-xs font-bold">{topic.commentsCount}</span>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <ChevronRight size={20} className="text-lof-600" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MessageSquare size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-medium">{c.noTopics}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Community;
