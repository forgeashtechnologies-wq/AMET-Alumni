// ============================================
// SHARED COMPONENTS INDEX
// ============================================
// Central export for all shared UI components

// Buttons
export {
  Button,
  PrimaryButton,
  SecondaryButton,
  MessageButton,
  RemoveButton,
  ConnectButton,
  SubmitButton,
  CancelButton,
  IconButton,
  primaryButtonClasses,
  secondaryButtonClasses,
  outlineButtonClasses,
  dangerButtonClasses,
  ghostButtonClasses,
} from './Buttons';

// Chips/Badges
export {
  TextPill,
  DegreeChip,
  BatchChip,
  DeptChip,
  CompanyChip,
  PositionChip,
} from './Chips';

// List States (Loading, Empty, Error, Partial)
export {
  LoadingSpinner,
  SkeletonCard,
  SkeletonRow,
  SkeletonList,
  SkeletonGrid,
  EmptyState,
  EmptySearchResults,
  EmptyConnections,
  EmptyMessages,
  EmptyEvents,
  EmptyGroups,
  ErrorState,
  PartialResultsBanner,
  LoadingOverlay,
  ListContainer,
} from './ListStates';

// Toast Notifications
export {
  useToast,
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  toastPromise,
  dismissToast,
  showCustomToast,
  CustomToast,
  toast,
} from './Toast';

// Connection CTA (if exists)
export { default as ConnectionCTA } from './ConnectionCTA';

// Form Components
export {
  FormField,
  FormSection,
  FormActions,
  FormProgress,
  FormHint,
} from './FormField';

// Confirmation Dialogs
export {
  ConfirmationDialog,
  DeleteConfirmationDialog,
  LeaveConfirmationDialog,
} from './ConfirmationDialog';
