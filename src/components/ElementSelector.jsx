import PropTypes from "prop-types";
import React, {
   forwardRef,
   useCallback,
   useEffect,
   useImperativeHandle,
   useRef,
   useState,
} from "react";

/**
 * ElementSelector - A React component for selecting any element or area on the page
 *
 * @param {Object} props - Component props
 * @returns {JSX.Element} - React component
 */
const ElementSelector = forwardRef(
   (
      {
         children,
         onSelectionChange,
         onSelectionComplete,
         minSelectionSize = 10,
         handleSize = 8,
         className = "",
         style = {},
         enabled = true,
      },
      ref
   ) => {
      // Refs
      const containerRef = useRef(null);

      // State
      const [isSelecting, setIsSelecting] = useState(false);
      const [hasSelection, setHasSelection] = useState(false);
      const [cursorPos, setCursorPos] = useState({ x: null, y: null });
      const [currentOperation, setCurrentOperation] = useState("none"); // 'none', 'select', 'move', 'resize'
      const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
      const [selectionRect, setSelectionRect] = useState({
         x: 0,
         y: 0,
         width: 0,
         height: 0,
      });
      const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
      const [resizeHandle, setResizeHandle] = useState(null);
      const [containerDimensions, setContainerDimensions] = useState({
         width: 0,
         height: 0,
      });

      // Update container dimensions when it changes
      useEffect(() => {
         const currentContainer = containerRef.current;
         if (currentContainer) {
            const updateDimensions = () => {
               setContainerDimensions({
                  width: currentContainer.offsetWidth,
                  height: currentContainer.offsetHeight,
               });
            };

            updateDimensions();

            // Set up resize observer to update dimensions when container size changes
            const resizeObserver = new ResizeObserver(updateDimensions);
            resizeObserver.observe(currentContainer);

            return () => {
               resizeObserver.unobserve(currentContainer);
               resizeObserver.disconnect();
            };
         }
      }, []);

      // Handle resize operation
      const handleResize = useCallback(
         (x, y) => {
            // Get current selection values
            let { x: sx, y: sy, width: sw, height: sh } = selectionRect;

            // Variables for calculations - declare outside case blocks
            let newX, newY;

            // Calculate new values based on which handle is being dragged
            switch (resizeHandle) {
               case "topleft":
                  // Limit to minimum size
                  newX = Math.min(x, sx + sw - minSelectionSize);
                  newY = Math.min(y, sy + sh - minSelectionSize);

                  // Update width and height based on new position
                  sw = sx + sw - newX;
                  sh = sy + sh - newY;
                  sx = newX;
                  sy = newY;
                  break;

               case "topright":
                  newY = Math.min(y, sy + sh - minSelectionSize);

                  // Update width and height
                  sw = Math.max(minSelectionSize, x - sx);
                  sh = sy + sh - newY;
                  sy = newY;
                  break;

               case "bottomleft":
                  newX = Math.min(x, sx + sw - minSelectionSize);

                  // Update width and height
                  sw = sx + sw - newX;
                  sh = Math.max(minSelectionSize, y - sy);
                  sx = newX;
                  break;

               case "bottomright":
                  // Update width and height
                  sw = Math.max(minSelectionSize, x - sx);
                  sh = Math.max(minSelectionSize, y - sy);
                  break;

               case "top":
                  newY = Math.min(y, sy + sh - minSelectionSize);

                  // Update height only
                  sh = sy + sh - newY;
                  sy = newY;
                  break;

               case "bottom":
                  // Update height only
                  sh = Math.max(minSelectionSize, y - sy);
                  break;

               case "left":
                  newX = Math.min(x, sx + sw - minSelectionSize);

                  // Update width only
                  sw = sx + sw - newX;
                  sx = newX;
                  break;

               case "right":
                  // Update width only
                  sw = Math.max(minSelectionSize, x - sx);
                  break;

               default:
                  // No handle selected or unknown handle
                  break;
            }

            // Update selection rectangle with new values
            setSelectionRect({
               x: Math.max(0, sx),
               y: Math.max(0, sy),
               width: Math.min(sw, containerDimensions.width - sx),
               height: Math.min(sh, containerDimensions.height - sy),
            });
         },
         [selectionRect, resizeHandle, minSelectionSize, containerDimensions]
      );

      // Helper function to check if a point is within a rectangle
      const isWithinRect = (x, y, rx, ry, rw, rh) => {
         return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
      };

      // Get resize handle at position
      const getResizeHandleAt = useCallback(
         (x, y) => {
            if (!hasSelection) return null;

            const handleHitSize = handleSize + 4; // Slightly larger for easier grabbing
            const { x: sx, y: sy, width: sw, height: sh } = selectionRect;

            // Check corners first (they take precedence)
            if (
               isWithinRect(
                  x,
                  y,
                  sx - handleHitSize / 2,
                  sy - handleHitSize / 2,
                  handleHitSize,
                  handleHitSize
               )
            )
               return "topleft";
            if (
               isWithinRect(
                  x,
                  y,
                  sx + sw - handleHitSize / 2,
                  sy - handleHitSize / 2,
                  handleHitSize,
                  handleHitSize
               )
            )
               return "topright";
            if (
               isWithinRect(
                  x,
                  y,
                  sx - handleHitSize / 2,
                  sy + sh - handleHitSize / 2,
                  handleHitSize,
                  handleHitSize
               )
            )
               return "bottomleft";
            if (
               isWithinRect(
                  x,
                  y,
                  sx + sw - handleHitSize / 2,
                  sy + sh - handleHitSize / 2,
                  handleHitSize,
                  handleHitSize
               )
            )
               return "bottomright";

            // Then check edges
            if (
               isWithinRect(
                  x,
                  y,
                  sx + sw / 2 - handleHitSize / 2,
                  sy - handleHitSize / 2,
                  handleHitSize,
                  handleHitSize
               )
            )
               return "top";
            if (
               isWithinRect(
                  x,
                  y,
                  sx + sw / 2 - handleHitSize / 2,
                  sy + sh - handleHitSize / 2,
                  handleHitSize,
                  handleHitSize
               )
            )
               return "bottom";
            if (
               isWithinRect(
                  x,
                  y,
                  sx - handleHitSize / 2,
                  sy + sh / 2 - handleHitSize / 2,
                  handleHitSize,
                  handleHitSize
               )
            )
               return "left";
            if (
               isWithinRect(
                  x,
                  y,
                  sx + sw - handleHitSize / 2,
                  sy + sh / 2 - handleHitSize / 2,
                  handleHitSize,
                  handleHitSize
               )
            )
               return "right";

            return null;
         },
         [hasSelection, selectionRect, handleSize]
      );

      // Start selection operation
      const startOperation = useCallback(
         (e) => {
            if (!enabled || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if we're on a resize handle
            if (hasSelection) {
               const handle = getResizeHandleAt(x, y);

               if (handle) {
                  setIsSelecting(true);
                  setCurrentOperation("resize");
                  setResizeHandle(handle);
                  return;
               }

               // Check if we're inside the selection
               if (
                  x >= selectionRect.x &&
                  x <= selectionRect.x + selectionRect.width &&
                  y >= selectionRect.y &&
                  y <= selectionRect.y + selectionRect.height
               ) {
                  setIsSelecting(true);
                  setCurrentOperation("move");
                  setDragOffset({
                     x: x - selectionRect.x,
                     y: y - selectionRect.y,
                  });
                  return;
               }
            }

            // Start new selection
            setIsSelecting(true);
            setCurrentOperation("select");
            setSelectionStart({ x, y });
            setSelectionRect({ x, y, width: 0, height: 0 });
         },
         [enabled, hasSelection, selectionRect, getResizeHandleAt]
      );

      // Update operation
      const updateOperation = useCallback(
         (e) => {
            if (!isSelecting || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = Math.max(
               0,
               Math.min(e.clientX - rect.left, containerDimensions.width)
            );
            const y = Math.max(
               0,
               Math.min(e.clientY - rect.top, containerDimensions.height)
            );

            if (currentOperation === "select") {
               // Update selection dimensions
               setSelectionRect({
                  x: Math.min(selectionStart.x, x),
                  y: Math.min(selectionStart.y, y),
                  width: Math.abs(x - selectionStart.x),
                  height: Math.abs(y - selectionStart.y),
               });
            } else if (currentOperation === "move") {
               // Move selection
               const newX = Math.max(
                  0,
                  Math.min(
                     x - dragOffset.x,
                     containerDimensions.width - selectionRect.width
                  )
               );
               const newY = Math.max(
                  0,
                  Math.min(
                     y - dragOffset.y,
                     containerDimensions.height - selectionRect.height
                  )
               );

               setSelectionRect((prev) => ({
                  ...prev,
                  x: newX,
                  y: newY,
               }));
            } else if (currentOperation === "resize") {
               handleResize(x, y);
            }

            // Notify about selection change
            if (onSelectionChange) {
               onSelectionChange(selectionRect);
            }
         },
         [
            isSelecting,
            currentOperation,
            selectionStart,
            selectionRect,
            dragOffset,
            handleResize,
            containerDimensions,
            onSelectionChange,
         ]
      );

      // Reset selection
      const resetSelection = useCallback(() => {
         setHasSelection(false);
         setSelectionRect({ x: 0, y: 0, width: 0, height: 0 });
      }, []);

      // End operation
      const endOperation = useCallback(() => {
         if (!isSelecting) return;

         if (currentOperation === "select") {
            // Check if selection is valid
            if (
               selectionRect.width > minSelectionSize &&
               selectionRect.height > minSelectionSize
            ) {
               setHasSelection(true);
            } else {
               // Selection too small, clear it
               resetSelection();
            }
         }

         setIsSelecting(false);
         setCurrentOperation("none");
         setResizeHandle(null);

         // Notify about selection completion
         if (onSelectionComplete) {
            onSelectionComplete(selectionRect);
         }
      }, [
         isSelecting,
         currentOperation,
         selectionRect,
         minSelectionSize,
         onSelectionComplete,
         resetSelection,
      ]);

      // Get cursor style for resize handle
      const getHandleCursor = (position) => {
         switch (position) {
            case "topleft":
            case "bottomright":
               return "nwse-resize";
            case "topright":
            case "bottomleft":
               return "nesw-resize";
            case "top":
            case "bottom":
               return "ns-resize";
            case "left":
            case "right":
               return "ew-resize";
            default:
               return "move";
         }
      };

      // Set up event listeners
      useEffect(() => {
         const handleMouseMove = (e) => {
            if (containerRef.current) {
               const rect = containerRef.current.getBoundingClientRect();
               const cx = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
               const cy = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
               setCursorPos({ x: cx, y: cy });
            }
            updateOperation(e);
         };
         const handleMouseLeave = () => {
            setCursorPos({ x: null, y: null });
         };
         const handleMouseUp = () => endOperation();

         document.addEventListener("mousemove", handleMouseMove);
         document.addEventListener("mouseleave", handleMouseLeave);
         document.addEventListener("mouseup", handleMouseUp);

         return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseleave", handleMouseLeave);
            document.removeEventListener("mouseup", handleMouseUp);
         };
      }, [updateOperation, endOperation]);

      // Get coordinates relative to the document
      const getAbsoluteCoordinates = useCallback(() => {
         if (!hasSelection || !containerRef.current) return null;

         const containerRect = containerRef.current.getBoundingClientRect();
         const scrollLeft =
            window.pageXOffset || document.documentElement.scrollLeft;
         const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;

         return {
            x: containerRect.left + selectionRect.x + scrollLeft,
            y: containerRect.top + selectionRect.y + scrollTop,
            width: selectionRect.width,
            height: selectionRect.height,
            // Also include relative coordinates
            relative: { ...selectionRect },
         };
      }, [hasSelection, selectionRect]);

      // Expose methods to parent component via ref
      useImperativeHandle(ref, () => ({
         getCoordinates: getAbsoluteCoordinates,
         resetSelection,
         hasActiveSelection: () => hasSelection,
         getSelectionRect: () => ({ ...selectionRect }),
      }));

      // Calculate clip path for overlay
      const getClipPath = () => {
         // If we're not selecting and don't have a selection, don't apply a clip path
         if (!isSelecting && !hasSelection) {
            return "none";
         }

         // If we're selecting but the selection has no dimensions yet,
         // create a clip path with a small hole at the cursor position
         if (
            isSelecting &&
            selectionRect.width === 0 &&
            selectionRect.height === 0
         ) {
            const { x, y } = selectionStart;
            const containerWidth = containerDimensions.width;
            const containerHeight = containerDimensions.height;

            // Calculate percentages for the cursor position
            const left = (x / containerWidth) * 100;
            const top = (y / containerHeight) * 100;

            // Create a small hole (1x1 pixel) at the cursor position
            return `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${left}% ${top}%, ${
               left + 0.1
            }% ${top}%, ${left + 0.1}% ${top + 0.1}%, ${left}% ${
               top + 0.1
            }%, ${left}% ${top}%)`;
         }

         // Normal case: we have a selection with dimensions
         const { x, y, width, height } = selectionRect;
         const containerWidth = containerDimensions.width;
         const containerHeight = containerDimensions.height;

         // Calculate clip path percentages
         const left = (x / containerWidth) * 100;
         const top = (y / containerHeight) * 100;
         const right = ((x + width) / containerWidth) * 100;
         const bottom = ((y + height) / containerHeight) * 100;

         return `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${left}% ${top}%, ${right}% ${top}%, ${right}% ${bottom}%, ${left}% ${bottom}%, ${left}% ${top}%)`;
      };

      return (
         <div
            ref={containerRef}
            className={`element-selector ${className}`}
            style={{
               position: "relative",
               ...style,
            }}
            onMouseDown={enabled ? startOperation : undefined}
         >
            {/* Content */}
            {children}

            {/* Full-screen X and Y Dotted Guide Lines following cursor */}
            {enabled && cursorPos.x !== null && cursorPos.y !== null && (
               <>
                  {/* Horizontal X Axis Dotted Line (browser start to end) */}
                  <div
                     className="crosshair-guide-x pointer-events-none"
                     style={{
                        position: "absolute",
                        left: 0,
                        top: `${cursorPos.y}px`,
                        width: "100%",
                        height: "0px",
                        borderTop: "1.5px dashed rgba(59, 130, 246, 0.9)",
                        filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.7))",
                        zIndex: 999,
                        pointerEvents: "none",
                     }}
                  />

                  {/* Vertical Y Axis Dotted Line (browser top to bottom) */}
                  <div
                     className="crosshair-guide-y pointer-events-none"
                     style={{
                        position: "absolute",
                        top: 0,
                        left: `${cursorPos.x}px`,
                        width: "0px",
                        height: "100%",
                        borderLeft: "1.5px dashed rgba(59, 130, 246, 0.9)",
                        filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.7))",
                        zIndex: 999,
                        pointerEvents: "none",
                     }}
                  />

                  {/* Intersection Crosshair Point Indicator */}
                  <div
                     className="crosshair-point pointer-events-none"
                     style={{
                        position: "absolute",
                        left: `${cursorPos.x - 3}px`,
                        top: `${cursorPos.y - 3}px`,
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        backgroundColor: "#3b82f6",
                        border: "1.5px solid #ffffff",
                        boxShadow: "0 0 8px rgba(59, 130, 246, 0.95)",
                        zIndex: 1000,
                        pointerEvents: "none",
                     }}
                  />
               </>
            )}

            {/* Selection overlay */}
            {enabled && (
               <div
                  className="selection-overlay"
                  style={{
                     position: "absolute",
                     top: 0,
                     left: 0,
                     width: "100%",
                     height: "100%",
                     backgroundColor:
                        isSelecting || hasSelection
                           ? "rgba(0, 0, 0, 0.5)"
                           : "transparent",
                     clipPath: getClipPath(),
                     pointerEvents: "none",
                     zIndex: 1000,
                     transition: "background-color 0.1s ease",
                  }}
               />
            )}

            {/* Active selection indicator */}
            {enabled && isSelecting && currentOperation === "select" && (
               <div
                  className="selection-in-progress animated-border"
                  style={{
                     position: "absolute",
                     left: `${selectionRect.x}px`,
                     top: `${selectionRect.y}px`,
                     width: `${selectionRect.width}px`,
                     height: `${selectionRect.height}px`,
                     border: "2px dashed rgba(0, 255, 0, 0.8)",
                     backgroundColor: "transparent",
                     boxSizing: "border-box",
                     pointerEvents: "none",
                     zIndex: 1001,
                  }}
               />
            )}

            {/* Selection rectangle */}
            {enabled && hasSelection && (
               <div
                  className="selection-rect"
                  style={{
                     position: "absolute",
                     left: `${selectionRect.x}px`,
                     top: `${selectionRect.y}px`,
                     width: `${selectionRect.width}px`,
                     height: `${selectionRect.height}px`,
                     border:
                        currentOperation === "resize"
                           ? "2px dashed rgba(0, 255, 0, 0.8)"
                           : "2px solid rgba(0, 255, 0, 0.8)",
                     backgroundColor: "transparent",
                     boxSizing: "border-box",
                     cursor: "move",
                     zIndex: 1001,
                  }}
               >
                  {/* Resize handles */}
                  {[
                     "topleft",
                     "top",
                     "topright",
                     "right",
                     "bottomright",
                     "bottom",
                     "bottomleft",
                     "left",
                  ].map((position) => (
                     <div
                        key={position}
                        className={`resize-handle ${position}`}
                        style={{
                           position: "absolute",
                           width: `${handleSize}px`,
                           height: `${handleSize}px`,
                           backgroundColor: "white",
                           border:
                              currentOperation === "resize"
                                 ? "2px dashed rgba(0, 255, 0, 0.8)"
                                 : "2px solid rgba(0, 100, 0, 0.8)",
                           borderRadius: "50%",
                           pointerEvents: "all",
                           cursor: getHandleCursor(position),
                           ...getHandlePosition(position, handleSize),
                           zIndex: 1002,
                        }}
                        onMouseDown={(e) => {
                           e.stopPropagation();
                           setIsSelecting(true);
                           setCurrentOperation("resize");
                           setResizeHandle(position);
                        }}
                     />
                  ))}
               </div>
            )}
         </div>
      );
   }
);

// Helper function to get handle position
function getHandlePosition(position, size) {
   const offset = size / 2;

   switch (position) {
      case "topleft":
         return { top: -offset, left: -offset };
      case "top":
         return { top: -offset, left: `calc(50% - ${offset}px)` };
      case "topright":
         return { top: -offset, right: -offset };
      case "right":
         return { top: `calc(50% - ${offset}px)`, right: -offset };
      case "bottomright":
         return { bottom: -offset, right: -offset };
      case "bottom":
         return { bottom: -offset, left: `calc(50% - ${offset}px)` };
      case "bottomleft":
         return { bottom: -offset, left: -offset };
      case "left":
         return { top: `calc(50% - ${offset}px)`, left: -offset };
      default:
         return {};
   }
}

ElementSelector.propTypes = {
   children: PropTypes.node.isRequired,
   onSelectionChange: PropTypes.func,
   onSelectionComplete: PropTypes.func,
   minSelectionSize: PropTypes.number,
   handleSize: PropTypes.number,
   className: PropTypes.string,
   style: PropTypes.object,
   enabled: PropTypes.bool,
};

export default ElementSelector;
