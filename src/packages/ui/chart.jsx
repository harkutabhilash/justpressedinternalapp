"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "./utils";

/**
 * Chart context + container
 */

const THEMES = { light: "", dark: ".dark" };

const ChartContext = React.createContext(null);

export function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within a <ChartContainer />");
  return ctx;
}

export function ChartContainer({ id, className, children, config = {}, ...props }) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-hidden",
          "[&_.recharts-sector]:outline-hidden",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-surface]:outline-hidden",
          "flex aspect-video justify-center text-xs",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

/**
 * Inject CSS vars like `--color-sales`, based on `config`:
 * config = { sales: { color: "#22c55e" } } OR
 * config = { sales: { theme: { light: "#22c55e", dark: "#16a34a" } } }
 */
export function ChartStyle({ id, config = {} }) {
  const colorConfig = Object.entries(config).filter(
    ([, v]) => v && (v.theme || v.color)
  );

  if (!colorConfig.length) return null;

  const css = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const lines = colorConfig
        .map(([key, v]) => {
          const color = (v.theme && v.theme[theme]) || v.color;
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter(Boolean)
        .join("\n");
      return `${prefix} [data-chart=${id}] {\n${lines}\n}`;
    })
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/**
 * Tooltips
 */

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  indicator = "dot", // "dot" | "line" | "dashed"
  hideLabel = false,
  hideIndicator = false,
  labelFormatter,
  labelClassName,
  formatter, // (value, name, item, index, raw) => ReactNode
  color,
  nameKey,
  labelKey,
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const first = payload[0];

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel) return null;

    const key = `${labelKey || first?.dataKey || first?.name || "value"}`;
    const itemCfg = getPayloadConfig(config, first, key);

    let value =
      (labelKey && config[labelKey]?.label) ||
      itemCfg?.label ||
      (typeof label === "string" ? label : undefined);

    if (labelFormatter) {
      return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>;
    }

    return value ? <div className={cn("font-medium", labelClassName)}>{value}</div> : null;
  }, [hideLabel, labelKey, first, config, label, labelFormatter, labelClassName, payload]);

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemCfg = getPayloadConfig(config, item, key);

          const itemColor =
            color ||
            item?.payload?.fill ||
            item?.color ||
            config?.[key]?.color ||
            `var(--color-${key})`;

          return (
            <div
              key={`${item.dataKey || item.name || index}`}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2",
                "[&>svg]:text-muted-foreground [&>svg]:h-2.5 [&>svg]:w-2.5",
                indicator === "dot" ? "items-center" : ""
              )}
            >
              {formatter && item?.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {!hideIndicator && (
                    <div
                      className={cn(
                        "shrink-0 rounded-[2px]",
                        indicator === "dot" && "h-2.5 w-2.5",
                        indicator === "line" && "h-2 w-3",
                        indicator === "dashed" && "my-0.5 w-0 border-[1.5px] border-dashed bg-transparent"
                      )}
                      style={
                        indicator === "dashed"
                          ? { borderColor: itemColor }
                          : { backgroundColor: itemColor }
                      }
                    />
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center"
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemCfg?.label || item.name}
                      </span>
                    </div>
                    {item.value != null && (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {Number(item.value).toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Legend
 */

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
    >
      {payload.map((item, idx) => {
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemCfg = getPayloadConfig(config, item, key);
        const swatch = item?.color || config?.[key]?.color || `var(--color-${key})`;

        return (
          <div
            key={`${item.value || key}-${idx}`}
            className="[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
          >
            {!hideIcon ? (
              itemCfg?.icon ? (
                <itemCfg.icon />
              ) : (
                <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: swatch }} />
              )
            ) : null}
            {itemCfg?.label || item.value || key}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helpers
 */

function getPayloadConfig(config = {}, payloadItem, fallbackKey) {
  let key = fallbackKey;

  if (payloadItem && typeof payloadItem === "object") {
    if (typeof payloadItem[fallbackKey] === "string") {
      key = payloadItem[fallbackKey];
    }
    const raw = payloadItem.payload;
    if (raw && typeof raw === "object" && typeof raw[fallbackKey] === "string") {
      key = raw[fallbackKey];
    }
  }

  return config[key] || config[fallbackKey];
}
