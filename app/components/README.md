# Dashboard Components

## BatteryWidget

A beautiful CSS-based battery visualization component that displays the current battery level with realistic visual representation.

### Features

- **Visual Battery Display**: Pure CSS battery shape with realistic gradients and reflections
- **Color-Coded Levels**:
  - 🟢 Green (40-100%): Healthy battery level
  - 🟡 Yellow (20-39%): Battery getting low
  - 🔴 Red (0-19%): Critical battery level
- **Charging Indicator**: Animated lightning bolt icon when charging
- **Low Battery Warning**: Shows alert text when below 20% and not charging
- **Responsive Design**: Adapts to different screen sizes
- **Dark Mode Support**: Works seamlessly in both light and dark themes

### Usage

```tsx
import { BatteryWidget } from "~/components/BatteryWidget";

<BatteryWidget
  level={75}           // Battery percentage (0-100)
  isCharging={true}    // Charging status
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `level` | `number` | Yes | Battery level from 0 to 100 |
| `isCharging` | `boolean` | Yes | Whether the battery is currently charging |
| `className` | `string` | No | Additional CSS classes |

### Visual States

**Charging**: Shows a pulsing yellow lightning bolt icon in the center of the battery

**Low Battery**: When level < 20% and not charging, displays a warning message below the battery

### Integration with Mock Service

The widget automatically receives data from the mock battery service running in the background. The battery level and charging status update every 30 seconds.

### Credits

Battery CSS design inspired by [Lynn Fisher's Single Div project](http://a.singlediv.com/#battery), adapted for React and enhanced with charging indicators.

