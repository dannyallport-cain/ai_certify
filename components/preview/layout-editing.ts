import type React from 'react';

export interface CertificatePreviewBlockPosition {
  x: number;
  y: number;
}

export type CertificatePreviewBlockPositions = Record<string, CertificatePreviewBlockPosition>;

export interface CertificatePreviewLayoutEditBindings {
  className: string;
  style?: React.CSSProperties;
  onMouseDown?: (event: React.MouseEvent<HTMLElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

export interface CertificatePreviewLayoutSelection {
  selectedBlockId: string | null;
  onSelectBlock?: (blockId: string | null) => void;
}

export interface CertificatePreviewLayoutMovement {
  blockPositions: CertificatePreviewBlockPositions;
  onMoveBlock?: (blockId: string, position: CertificatePreviewBlockPosition) => void;
}

export interface CertificatePreviewLayoutEditSession {
  enabled: boolean;
  selection: CertificatePreviewLayoutSelection;
  movement: CertificatePreviewLayoutMovement;
}

export interface CertificatePreviewLayoutBlockState {
  className: string;
  style?: React.CSSProperties;
  isSelected: boolean;
  position: CertificatePreviewBlockPosition;
}

function getDefaultPosition(): CertificatePreviewBlockPosition {
  return { x: 0, y: 0 };
}

function getBlockPosition(
  blockId: string,
  blockPositions: CertificatePreviewBlockPositions
): CertificatePreviewBlockPosition {
  const position = blockPositions[blockId];

  if (!position) {
    return getDefaultPosition();
  }

  return {
    x: Number.isFinite(position.x) ? position.x : 0,
    y: Number.isFinite(position.y) ? position.y : 0,
  };
}

export function getCertificatePreviewBlockClassName(
  enabled: boolean,
  isSelected: boolean,
  baseClassName = ''
) {
  return `${baseClassName} ${
    enabled
      ? 'relative cursor-move select-none rounded-sm outline outline-1 outline-dashed outline-blue-300 hover:outline-blue-500'
      : ''
  } ${enabled && isSelected ? 'outline-2 outline-blue-600 bg-blue-50/30' : ''}`.trim();
}

export function getCertificatePreviewBlockStyle(
  enabled: boolean,
  position: CertificatePreviewBlockPosition
): React.CSSProperties | undefined {
  if (!enabled) return undefined;
  if (!position.x && !position.y) return undefined;

  return {
    transform: `translate(${position.x}px, ${position.y}px)`,
  };
}

export interface CertificatePreviewLayoutEditController {
  enabled: boolean;
  getBlockState: (blockId: string, baseClassName?: string) => CertificatePreviewLayoutBlockState;
  getBlockBindings: (
    blockId: string,
    baseClassName?: string
  ) => CertificatePreviewLayoutEditBindings;
  clearSelection: () => void;
}

export function createCertificatePreviewLayoutEditController(
  session: CertificatePreviewLayoutEditSession
): CertificatePreviewLayoutEditController {
  const { enabled, selection, movement } = session;
  const selectedBlockId = selection.selectedBlockId ?? null;
  const blockPositions = movement.blockPositions ?? {};

  const getBlockState = (
    blockId: string,
    baseClassName = ''
  ): CertificatePreviewLayoutBlockState => {
    const position = getBlockPosition(blockId, blockPositions);
    const isSelected = enabled && selectedBlockId === blockId;

    return {
      className: getCertificatePreviewBlockClassName(enabled, isSelected, baseClassName),
      style: getCertificatePreviewBlockStyle(enabled, position),
      isSelected,
      position,
    };
  };

  return {
    enabled,
    getBlockState,
    getBlockBindings: (blockId: string, baseClassName = '') => {
      const state = getBlockState(blockId, baseClassName);

      if (!enabled) {
        return {
          className: state.className,
          style: state.style,
        };
      }

      return {
        className: state.className,
        style: state.style,
        onMouseDown: (event) => {
          event.preventDefault();
          event.stopPropagation();

          selection.onSelectBlock?.(blockId);

          const startMouseX = event.clientX;
          const startMouseY = event.clientY;
          const origin = getBlockPosition(blockId, movement.blockPositions ?? {});

          const handleMouseMove = (moveEvent: MouseEvent) => {
            movement.onMoveBlock?.(blockId, {
              x: origin.x + (moveEvent.clientX - startMouseX),
              y: origin.y + (moveEvent.clientY - startMouseY),
            });
          };

          const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
          };

          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        },
        onClick: (event) => {
          event.stopPropagation();
          selection.onSelectBlock?.(blockId);
        },
      };
    },
    clearSelection: () => {
      if (enabled) {
        selection.onSelectBlock?.(null);
      }
    },
  };
}

export function createCertificatePreviewLayoutEditBindings(
  blockId: string,
  baseClassName: string,
  session: CertificatePreviewLayoutEditSession
): CertificatePreviewLayoutEditBindings {
  return createCertificatePreviewLayoutEditController(session).getBlockBindings(
    blockId,
    baseClassName
  );
}
