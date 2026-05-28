import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUp, Paperclip, Square, X, StopCircle, Mic, FileText, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { isAnalyzableImage, validateFile } from "@/services/fileUploadService";
import { isMobileOrTabletDevice } from "@/utils/mobileDetection";
import { isNativeApp } from "@/utils/platformDetection";
import { logger } from '@/utils/logger';

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex w-full rounded-md border-none bg-transparent px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] resize-none",
      className
    )}
    ref={ref}
    rows={1}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// Tooltip Components
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Dialog Components
const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-0 shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 z-10 rounded-full bg-muted/80 p-2 hover:bg-muted transition-all">
        <X className="h-5 w-5 text-foreground" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-primary hover:bg-primary/90 text-primary-foreground",
      outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
      ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
    };
    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6",
      icon: "h-8 w-8 rounded-full aspect-[1/1]",
    };
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// VoiceRecorder Component
interface VoiceRecorderProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: (duration: number) => void;
  visualizerBars?: number;
}
const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  visualizerBars = 32,
}) => {
  const [time, setTime] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
      if (isRecording) {
        logger.log('🎤 VoiceRecorder: Starting timer...');
        onStartRecording();
        timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setTime(0);
      }
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }, [isRecording, onStartRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center w-full transition-all duration-300 py-3",
        isRecording ? "opacity-100" : "opacity-0 h-0"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="font-mono text-sm text-foreground/80">{formatTime(time)}</span>
      </div>
      <div className="w-full h-10 flex items-center justify-center gap-0.5 px-4">
        {[...Array(visualizerBars)].map((_, i) => (
          <div
            key={i}
            className="w-0.5 rounded-full bg-foreground/50 animate-pulse"
            style={{
              height: `${Math.max(15, Math.random() * 100)}%`,
              animationDelay: `${i * 0.05}s`,
              animationDuration: `${0.5 + Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ImageViewDialog Component
interface ImageViewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}
const ImageViewDialog: React.FC<ImageViewDialogProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[90vw] md:max-w-[800px]">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-card rounded-2xl overflow-hidden shadow-2xl"
        >
          <img
            src={imageUrl}
            alt="Full preview"
            className="w-full max-h-[80vh] object-contain rounded-2xl"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

// PromptInput Context and Components
interface PromptInputContextType {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
}
const PromptInputContext = React.createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});
function usePromptInput() {
  const context = React.useContext(PromptInputContext);
  if (!context) throw new Error("usePromptInput must be used within a PromptInput");
  return context;
}

interface PromptInputProps {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}
const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  (
    {
      className,
      isLoading = false,
      maxHeight = 240,
      value,
      onValueChange,
      onSubmit,
      children,
      disabled = false,
      onDragOver,
      onDragLeave,
      onDrop,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value || "");
    const handleChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };
    return (
      <TooltipProvider>
        <PromptInputContext.Provider
          value={{
            isLoading,
            value: value ?? internalValue,
            setValue: onValueChange ?? handleChange,
            maxHeight,
            onSubmit,
            disabled,
          }}
        >
          <div
            ref={ref}
            className={cn(
              "rounded-3xl border border-border bg-card p-2 shadow-lg transition-all duration-300",
              isLoading && "border-destructive/70",
              className
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {children}
          </div>
        </PromptInputContext.Provider>
      </TooltipProvider>
    );
  }
);
PromptInput.displayName = "PromptInput";

interface PromptInputTextareaProps {
  disableAutosize?: boolean;
  placeholder?: string;
}
const PromptInputTextarea: React.FC<PromptInputTextareaProps & React.ComponentProps<typeof Textarea>> = ({
  className,
  onKeyDown,
  disableAutosize = false,
  placeholder,
  ...props
}) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (disableAutosize || !textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
    onKeyDown?.(e);
  };

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      className={cn("text-base", className)}
      disabled={disabled}
      placeholder={placeholder}
      {...props}
    />
  );
};

interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {}
const PromptInputActions: React.FC<PromptInputActionsProps> = ({ children, className, ...props }) => (
  <div className={cn("flex items-center gap-2", className)} {...props}>
    {children}
  </div>
);

interface PromptInputActionProps extends React.ComponentProps<typeof Tooltip> {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}
const PromptInputAction: React.FC<PromptInputActionProps> = ({
  tooltip,
  children,
  side = "top",
  ...props
}) => {
  const { disabled } = usePromptInput();
  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
};

// Custom Divider Component
const CustomDivider: React.FC = () => (
  <div className="relative h-6 w-[1.5px] mx-1">
    <div className="absolute inset-0 bg-border rounded-full" />
  </div>
);

// Main PromptInputBox Component
interface PromptInputBoxProps {
  onSend?: (message: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}
export const PromptInputBox = React.forwardRef((props: PromptInputBoxProps, ref: React.Ref<HTMLDivElement>) => {
  const { onSend = () => {}, isLoading = false, placeholder = "Type your message here...", className } = props;
  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [filePreviews, setFilePreviews] = React.useState<{ [key: string]: string }>({});
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const promptBoxRef = React.useRef<HTMLDivElement>(null);
  const recordingStartTime = React.useRef<number>(0);
  
  const audioRecorder = useAudioRecorder();

  // Show error from audio recorder if any
  React.useEffect(() => {
    if (audioRecorder.error) {
      toast({
        title: "Microphone Error",
        description: audioRecorder.error,
        variant: "destructive",
      });
    }
  }, [audioRecorder.error]);


  const isImageFile = (file: File) => file.type.startsWith("image/");

  const processFile = (file: File) => {
    logger.log('📁 [PromptInputBox] processFile called:', file.name, file.type);

    // Reuse the shared validator so the prompt-box paperclip accepts the
    // same set of file types as the dedicated upload service (PDFs, Excel,
    // CSV, text, images) and honors the same 25MB size cap.
    const { valid, error } = validateFile(file);
    if (!valid) {
      logger.log('⚠️ [PromptInputBox] File rejected:', error);
      toast({
        title: "Can't attach that file",
        description: error,
        variant: "destructive",
      });
      return;
    }

    logger.log('✅ [PromptInputBox] File accepted:', file.name);
    setFiles([file]);
    // Only render a thumbnail preview for image attachments — non-images get
    // a generic chip rendered below.
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreviews({ [file.name]: e.target?.result as string });
      reader.readAsDataURL(file);
    } else {
      setFilePreviews({});
    }
  };

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) processFile(dropped[0]);
  }, []);

  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove && filePreviews[fileToRemove.name]) setFilePreviews({});
    setFiles([]);
  };

  const openImageModal = (imageUrl: string) => setSelectedImage(imageUrl);

  const handlePaste = React.useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          break;
        }
      }
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleSubmit = () => {
    // Capture files IMMEDIATELY before any state changes
    const currentFiles = [...files];
    const currentInput = input;
    
    logger.log('📤 [PromptInputBox] handleSubmit called:', {
      inputLength: currentInput.length,
      filesCount: currentFiles.length,
      fileNames: currentFiles.map(f => f.name)
    });
    
    if (currentInput.trim() || currentFiles.length > 0) {
      // Clear state first to prevent UI issues
      setInput("");
      setFiles([]);
      setFilePreviews({});
      
      // Then send with captured values
      logger.log('📤 [PromptInputBox] Sending to onSend with files:', currentFiles.length);
      onSend(currentInput, currentFiles);
    }
  };

  const handleStartRecording = async () => {
    logger.log("🎤 [PromptInputBox] handleStartRecording called");
    recordingStartTime.current = Date.now();
    try {
      await audioRecorder.startRecording();
      if (audioRecorder.isRecording) {
        logger.log("✅ [PromptInputBox] Recording started successfully");
      } else {
        logger.error("❌ [PromptInputBox] Recording failed to start");
        setIsRecording(false);
        toast({
          title: "Recording failed",
          description: "Could not start recording. Please check microphone permissions.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error("❌ [PromptInputBox] Error starting recording:", error);
      setIsRecording(false);
      toast({
        title: "Recording error",
        description: error instanceof Error ? error.message : "Failed to start recording",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async (duration: number) => {
    logger.log(`🎤 [PromptInputBox] handleStopRecording called with duration: ${duration}s`);
    
    // Don't process if duration is invalid
    if (duration <= 0) {
      logger.log('⚠️ [PromptInputBox] Invalid recording duration, ignoring');
      return;
    }
    
    // Note: isRecording is already false at this point (set by button click)
    setIsTranscribing(true);

    try {
      logger.log('🎙️ [PromptInputBox] Getting audio data from recorder...');
      const base64Audio = await audioRecorder.stopRecording();
      logger.log('🎙️ [PromptInputBox] stopRecording returned:', base64Audio ? `${base64Audio.length} bytes` : 'null');
      
      if (!base64Audio) {
        logger.error('❌ [PromptInputBox] No audio data received from recorder');
        toast({
          title: "Recording failed",
          description: "Could not process audio recording. Please try again.",
          variant: "destructive",
        });
        setIsTranscribing(false);
        return;
      }

      logger.log('✅ [PromptInputBox] Audio captured successfully, size:', base64Audio.length, 'bytes');
      logger.log('📡 [PromptInputBox] Sending to transcription edge function...');
      
      // Determine platform for Apple compliance headers (includes iPad browsers)
      const platformHeader = isNativeApp() ? 'ios' : (isMobileOrTabletDevice() ? 'mobile' : undefined);
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio },
        headers: platformHeader ? { 'x-client-platform': platformHeader } : undefined
      });
      
      logger.log('📥 [PromptInputBox] Transcription response:', { data, error });

      if (error) {
        logger.error('❌ [PromptInputBox] Transcription error:', error);
        
        if (error.message?.includes('429')) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a moment",
            variant: "destructive",
          });
        } else if (error.message?.includes('402') || error.message?.includes('503')) {
          const isMobile = isMobileOrTabletDevice();
          toast({
            title: isMobile ? "Feature Unavailable" : "Credits required",
            description: isMobile 
              ? "This feature is temporarily unavailable." 
              : "Please add credits to your workspace",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Transcription failed",
            description: "Could not transcribe audio. Please try again.",
            variant: "destructive",
          });
        }
        setIsTranscribing(false);
        return;
      }

      if (data?.text) {
        logger.log('✅ [PromptInputBox] Transcription successful:', data.text);
        logger.log('📝 [PromptInputBox] Setting input to:', data.text);
        setInput(data.text);
        logger.log('✅ [PromptInputBox] Input set successfully');
      } else {
        logger.warn('⚠️ [PromptInputBox] No text in transcription response:', data);
        toast({
          title: "No transcription",
          description: "Could not detect speech in the recording",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('❌ [PromptInputBox] Error during transcription:', error);
      toast({
        title: "Error",
        description: "An error occurred during transcription. Please try again.",
        variant: "destructive",
      });
    } finally {
      logger.log('🏁 [PromptInputBox] Transcription process complete');
      setIsTranscribing(false);
    }
  };

  const hasContent = input.trim() !== "" || files.length > 0;

  return (
    <>
      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        className={cn(
          "w-full bg-card border-border shadow-lg transition-all duration-300 ease-in-out",
          isRecording && "border-destructive/70",
          className
        )}
        disabled={isLoading || isRecording}
        ref={ref || promptBoxRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {files.length > 0 && !isRecording && (
          <div className="flex flex-wrap gap-2 p-0 pb-1 transition-all duration-300">
            {files.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const isSpreadsheet = file.type.includes("spreadsheet") || file.type.includes("excel") || file.type === "text/csv";
              return (
                <div key={index} className="relative group">
                  {isImage && filePreviews[file.name] ? (
                    <div
                      className="w-16 h-16 rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                      onClick={() => openImageModal(filePreviews[file.name])}
                    >
                      <img
                        src={filePreviews[file.name]}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="absolute top-1 right-1 rounded-full bg-background/70 p-0.5 opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-foreground" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl border border-border text-sm max-w-[280px]">
                      {isSpreadsheet ? (
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {(file.size / (1024 * 1024)).toFixed(1)}MB
                      </span>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors rounded-sm p-0.5 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isRecording && (
          <VoiceRecorder
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        )}

        {!isRecording && (
          <div className="flex items-center gap-2 w-full">
            <PromptInputAction tooltip="Attach file (PDF, Excel, CSV, image)">
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="flex h-10 w-10 text-muted-foreground cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-foreground flex-shrink-0"
              >
                <Paperclip className="h-5 w-5 transition-colors" />
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
                    if (e.target) e.target.value = "";
                  }}
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,text/plain"
                />
              </button>
            </PromptInputAction>

            <PromptInputTextarea
              placeholder={placeholder}
              className="text-base flex-1 border-none focus-visible:ring-0"
              rows={1}
            />

            <PromptInputAction
              tooltip={
                isLoading
                  ? "Stop generation"
                  : "Send message"
              }
            >
              <Button
                variant="default"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full transition-all duration-200 flex-shrink-0",
                  hasContent
                    ? "bg-foreground hover:bg-foreground/90 text-background"
                    : "bg-muted hover:bg-muted text-muted-foreground cursor-not-allowed"
                )}
                onClick={handleSubmit}
                disabled={!hasContent || isLoading}
              >
                {isLoading ? (
                  <Square className="h-4 w-4 fill-current animate-pulse" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </PromptInputAction>
          </div>
        )}
      </PromptInput>

      <ImageViewDialog imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </>
  );
});
PromptInputBox.displayName = "PromptInputBox";
