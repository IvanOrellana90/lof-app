import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pin, MessageSquare } from 'lucide-react';
import { getPinnedTopics, type CommunityTopic } from '../../services/communityService';
import { useLanguage } from '../../context/LanguageContext';

const PinnedTopics = () => {
    const { propertyId } = useParams();
    const { strings } = useLanguage();
    const [pinnedTopics, setPinnedTopics] = useState<CommunityTopic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!propertyId) return;
        setLoading(true);
        getPinnedTopics(propertyId)
            .then(setPinnedTopics)
            .finally(() => setLoading(false));
    }, [propertyId]);

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    if (pinnedTopics.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Pin size={20} className="text-amber-500" />
                    {strings.community.pinnedTopics}
                </h3>
            </div>

            {/* Pinned topics list */}
            <div className="space-y-2">
                {pinnedTopics.map((topic) => (
                    <Link
                        key={topic.id}
                        to="community"
                        className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100 hover:border-amber-300 hover:bg-amber-100/60 transition-all group"
                    >
                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500 transition-colors">
                            <MessageSquare size={14} className="text-amber-600 group-hover:text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">
                                {topic.title}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {topic.content}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default PinnedTopics;
