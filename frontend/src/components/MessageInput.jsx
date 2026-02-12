import React, { useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { X, Image as ImageIcon, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const MessageInput = () => {
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = React.useRef(null);
  const touchTimerRef = React.useRef(null);
  const { sendMessage, isSendingMessage, selectedUser } = useChatStore();
  const { socket } = useAuthStore();

  const readAsDataURL = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const compressImage = (file, maxWidth = 1000, quality = 0.7) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      readAsDataURL(file)
        .then(src => {
          img.src = src;
        })
        .catch(reject);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    });

  const handleImageChange = async e => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    try {
      const dataUrl =
        file.type === 'image/gif'
          ? await readAsDataURL(file)
          : await compressImage(file);
      setImagePreview(dataUrl);
    } catch (err) {
      const fallback = await readAsDataURL(file);
      setImagePreview(fallback);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendMessage = async e => {
    e.preventDefault();
    if (isSendingMessage) return;
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      setText('');
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (socket && selectedUser)
        socket.emit('stopTyping', { to: selectedUser._id });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="p-2 sm:p-4 w-full shrink-0">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
                            flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={e => {
              const val = e.target.value;
              setText(val);
              const trimmed = val.trim();
              if (socket && selectedUser) {
                if (trimmed) socket.emit('typing', { to: selectedUser._id });
                else socket.emit('stopTyping', { to: selectedUser._id });
              }
            }}
            onBlur={() => {
              if (socket && selectedUser)
                socket.emit('stopTyping', { to: selectedUser._id });
            }}
            onTouchStart={() => {
              if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
              touchTimerRef.current = setTimeout(() => {
                fileInputRef.current?.click();
              }, 500);
            }}
            onTouchEnd={() => {
              if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
            }}
            disabled={isSendingMessage}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? 'text-emerald-500' : 'text-zinc-400'}`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isSendingMessage}
          >
            <ImageIcon size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={(!text.trim() && !imagePreview) || isSendingMessage}
        >
          {isSendingMessage ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Send size={22} />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
