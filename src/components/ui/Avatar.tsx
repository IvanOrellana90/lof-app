import React, { useState } from 'react';
import { Camera } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onClick?: () => void;
  loading?: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', editable, onClick, loading }) => {
  const [imageError, setImageError] = useState(false);

  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const containerClass = `${sizeClasses[size]} rounded-full flex-shrink-0 relative group overflow-hidden ${editable ? 'cursor-pointer' : ''}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse">
          <div className="w-5 h-5 border-2 border-lof-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (src && !imageError) {
      return (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover border-2 border-white shadow-md rounded-full"
          onError={() => setImageError(true)}
        />
      );
    }

    // Fallback to initials
    const initial = name.charAt(0).toUpperCase();
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-purple-500 to-pink-600',
      'from-cyan-500 to-blue-600'
    ];
    const colorIndex = name.length % colors.length;
    const gradientClass = colors[colorIndex];

    return (
      <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold shadow-md border-2 border-white rounded-full`}>
        {initial}
      </div>
    );
  };

  return (
    <div className={containerClass} onClick={editable ? onClick : undefined}>
      {renderContent()}
      {editable && !loading && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Camera className="text-white" size={size === 'xl' ? 24 : 18} />
        </div>
      )}
    </div>
  );
};

export default Avatar;
