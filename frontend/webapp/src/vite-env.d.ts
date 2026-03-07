/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DEFAULT_EXCHANGE_RATE: string;
  readonly VITE_MARKET_DATA_API_URL: string;
  readonly VITE_API_STAGE: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// CSS/画像モジュール宣言
declare module '*.css' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

// Module declarations for packages without type definitions
declare module 'react-icons/fa' {
  import { ComponentType, SVGAttributes } from 'react';
  type IconType = ComponentType<SVGAttributes<SVGElement>>;
  export const FaUpload: IconType;
  export const FaCheckCircle: IconType;
  export const FaExclamationTriangle: IconType;
  export const FaTimes: IconType;
  export const FaSearch: IconType;
  export const FaDownload: IconType;
  export const FaTrash: IconType;
  export const FaEdit: IconType;
  export const FaPlus: IconType;
  export const FaCog: IconType;
  export const FaChartPie: IconType;
  export const FaSync: IconType;
  export const FaCheck: IconType;
  export const FaSpinner: IconType;
  export const FaInfoCircle: IconType;
  export const FaExclamationCircle: IconType;
  export const FaArrowUp: IconType;
  export const FaArrowDown: IconType;
  export const FaFileExport: IconType;
  export const FaFileImport: IconType;
  export const FaDatabase: IconType;
  export const FaWrench: IconType;
  export const FaSave: IconType;
  export const FaRedo: IconType;
  export const FaCopy: IconType;
  export const FaClipboard: IconType;
  export const FaChevronDown: IconType;
  export const FaChevronUp: IconType;
  export const FaChevronRight: IconType;
  export const FaChevronLeft: IconType;
  export const FaGoogleDrive: IconType;
  export const FaFile: IconType;
  export const FaFileAlt: IconType;
  export const FaBug: IconType;
  export const FaServer: IconType;
  export const FaLock: IconType;
  export const FaUnlock: IconType;
  export const FaUser: IconType;
  export const FaSignOutAlt: IconType;
  export const FaKey: IconType;
  export const FaEraser: IconType;
  export const FaTools: IconType;
  export const FaFlag: IconType;
  export const FaEye: IconType;
  export const FaEyeSlash: IconType;
  export const FaQuestionCircle: IconType;
  export const FaGlobe: IconType;
  export const FaYenSign: IconType;
  export const FaDollarSign: IconType;
  export const FaHistory: IconType;
  export const FaCamera: IconType;
  export const FaRobot: IconType;
  export const FaMagic: IconType;
  export const FaPaperPlane: IconType;
  export const FaThList: IconType;
  export const FaTable: IconType;
  export const FaGripLines: IconType;
  export const FaAngleDoubleUp: IconType;
  export const FaAngleDoubleDown: IconType;
  export const FaClipboardList: IconType;
  export const FaUserCheck: IconType;
}

// Recharts type compatibility fix for React 18
declare module 'recharts' {
  export const BarChart: any;
  export const Bar: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const ResponsiveContainer: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  export const Legend: any;
  export const LineChart: any;
  export const Line: any;
  export const AreaChart: any;
  export const Area: any;
  export const ComposedChart: any;
  export const Scatter: any;
  export const ReferenceLine: any;
}

// Missing component modules (stubs for not-yet-created components)
declare module '*/components/dashboard/AllocationChart' {
  const AllocationChart: React.ComponentType<any>;
  export default AllocationChart;
}

declare module '*/components/dashboard/RebalanceRecommendations' {
  const RebalanceRecommendations: React.ComponentType<any>;
  export default RebalanceRecommendations;
}
