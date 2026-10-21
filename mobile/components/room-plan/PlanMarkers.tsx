import { Circle, G, Line } from 'react-native-svg';

import type { PlanSceneMarker, PlanSceneText } from '@/modules/fire-alarm-roomplan';

import { PlanLabel } from './PlanLabel';

interface PlanMarkersProps {
  markers: PlanSceneMarker[];
  labels: PlanSceneText[];
  showLabels: boolean;
}

export function PlanMarkers({ markers, labels, showLabels }: PlanMarkersProps) {
  return (
    <G>
      {markers.map((marker) => (
        <G key={marker.id}>
          {marker.selected ? (
            <Circle
              cx={marker.x}
              cy={marker.y}
              r={marker.radius + 7}
              fill="none"
              stroke="#0D47A1"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.85}
            />
          ) : null}

          <Circle
            cx={marker.x}
            cy={marker.y}
            r={marker.radius + 2}
            fill="#FFFFFF"
            stroke={marker.colour}
            strokeWidth={marker.selected ? 2.5 : 1.5}
            opacity={0.95}
          />
          <Circle cx={marker.x} cy={marker.y} r={marker.radius} fill={marker.fill} opacity={1} />

          {marker.mountedOnCeiling ? (
            <Circle
              cx={marker.x}
              cy={marker.y}
              r={Math.max(marker.radius - 5, 1.5)}
              fill="#FFFFFF"
              opacity={0.9}
            />
          ) : null}

          {marker.identified ? null : (
            <Line
              x1={marker.x - marker.radius * 0.6}
              y1={marker.y + marker.radius * 0.6}
              x2={marker.x + marker.radius * 0.6}
              y2={marker.y - marker.radius * 0.6}
              stroke={marker.colour}
              strokeWidth={1.4}
              opacity={0.9}
            />
          )}
        </G>
      ))}

      {showLabels ? labels.map((label) => <PlanLabel key={label.id} label={label} />) : null}
    </G>
  );
}
