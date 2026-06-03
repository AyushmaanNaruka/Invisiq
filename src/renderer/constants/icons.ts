// Centralized Lucide icon registry for InvisiQ
// All icons used in the app MUST be imported from here to ensure consistency.
// Stroke width: 1.75 (slightly thinner than default 2 for elegance)

export {
  // ─── Branding ───
  Ghost,

  // ─── Navigation & Window Controls ───
  Settings,
  X,
  Minus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ExternalLink,

  // ─── AI & Chat ───
  Send,
  Square,
  MessageSquare,
  Bot,
  User,
  Clipboard,
  ClipboardCheck,
  ClipboardPaste,
  RotateCcw,
  Trash2,
  Download,
  Copy,
  Check,

  // ─── Modes ───
  Code,
  Layers,
  Shield,
  Sparkles,

  // ─── Screenshot & Capture ───
  Camera,
  Crop,
  Monitor,
  MonitorSmartphone,
  ScanSearch,

  // ─── Audio & Mic ───
  Mic,
  MicOff,
  AudioWaveform,
  Volume2,
  VolumeX,

  // ─── Status & Feedback ───
  Wifi,
  WifiOff,
  Zap,
  Clock,
  LoaderCircle,
  CircleAlert,
  CircleCheck,
  TriangleAlert,
  Info,
  CircleHelp,

  // ─── Settings Sections ───
  Key,
  Keyboard,
  Palette,
  EyeOff,
  Brain,
  Smartphone,
  FileText,

  // ─── Meeting & Transcript ───
  ListChecks,
  Lightbulb,

  // ─── Code & Files ───
  FileCode2,
  Bug,
  BookOpen,
  SearchCode,

  // ─── Templates ───
  LayoutTemplate,
  Mail,
  ChartColumn,
  Languages,

  // ─── Companion ───
  QrCode,
  Unplug,

  // ─── Theme ───
  Moon,
  Sun,

  // ─── Misc ───
  Plus,
  Pencil,
  Save,
  Search,
  Filter,
  Star,
  Tag,
  MousePointer,
  MousePointerBan,
} from 'lucide-react';

// ─── Icon sizing constants ───
export const ICON_SIZES = {
  xs: 12,   // Status indicators, inline
  sm: 14,   // Buttons, labels
  md: 16,   // Standard UI elements
  lg: 20,   // Headers, primary actions
  xl: 24,   // Feature icons, empty states
  '2xl': 32, // Onboarding, hero sections
} as const;

export type IconSize = keyof typeof ICON_SIZES;

// Standard stroke width for all icons
export const ICON_STROKE_WIDTH = 1.75;
