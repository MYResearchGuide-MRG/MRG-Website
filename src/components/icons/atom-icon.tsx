import { forwardRef, useImperativeHandle } from "react";
import type { AnimatedIconHandle, AnimatedIconProps } from "./types";
import { motion, useAnimate } from "motion/react";

const AtomIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  (
    { size = 24, color = "currentColor", strokeWidth = 2, className = "" },
    ref,
  ) => {
    const [scope, animate] = useAnimate();

    const start = async () => {
      animate(
        ".orbit-a",
        { rotate: 22 },
        { duration: 0.5, ease: "easeInOut" },
      );
      animate(
        ".orbit-b",
        { rotate: -22 },
        { duration: 0.5, ease: "easeInOut" },
      );
      animate(
        ".nucleus",
        { scale: [1, 1.3, 1] },
        { duration: 0.5, ease: "easeInOut" },
      );
    };

    const stop = () => {
      animate(".orbit-a, .orbit-b", { rotate: 0 }, { duration: 0.3, ease: "easeInOut" });
      animate(".nucleus", { scale: 1 }, { duration: 0.2, ease: "easeInOut" });
    };

    useImperativeHandle(ref, () => {
      return {
        startAnimation: start,
        stopAnimation: stop,
      };
    });

    const handleHoverStart = () => {
      start();
    };

    const handleHoverEnd = () => {
      stop();
    };

    return (
      <motion.svg
        ref={scope}
        onHoverStart={handleHoverStart}
        onHoverEnd={handleHoverEnd}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <motion.path
          className="orbit-a"
          style={{ transformOrigin: "12px 12px" }}
          d="M6.8 15c-2.968 2.532 -4.598 4.353 -3.598 5.353c1.36 1.36 6.184 -1.2 10.798 -5.815c4.614 -4.613 7.175 -9.436 5.814 -10.796c-1 -1 -2.821 .63 -5.354 3.598"
        />
        <motion.path
          className="orbit-b"
          style={{ transformOrigin: "12px 12px" }}
          d="M6.8 9c-2.968 -2.532 -4.598 -4.353 -3.598 -5.353c1.36 -1.36 6.184 1.2 10.798 5.815c4.614 4.613 7.175 9.436 5.814 10.796c-1 1 -2.821 -.63 -5.354 -3.598"
        />
        <motion.path
          className="nucleus"
          style={{ transformOrigin: "12px 12px" }}
          d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"
          fill={color}
        />
      </motion.svg>
    );
  },
);

AtomIcon.displayName = "AtomIcon";

export default AtomIcon;
