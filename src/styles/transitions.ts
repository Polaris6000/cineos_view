/**
 * CineOS — Framer Motion 페이지 전환 variants
 *
 * 사용법:
 *   import { pageVariants, pageTransition } from '@/styles/transitions'
 *
 *   <motion.div
 *     variants={pageVariants}
 *     initial="initial"
 *     animate="animate"
 *     exit="exit"
 *     transition={pageTransition}
 *   >
 *     ...
 *   </motion.div>
 */

/**
 * 기본 페이지 전환 variants
 * - initial: 페이지가 처음 마운트될 때 (아래에서 올라오며 페이드인)
 * - animate: 화면에 표시된 상태
 * - exit: 언마운트될 때 (위로 올라가며 페이드아웃)
 */
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,        // 12px 아래에서 시작
    scale: 0.98,  // 살짝 작은 상태에서 시작
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -10,       // 10px 위로 나가며
    scale: 0.98,
  },
};

/**
 * 기본 전환 타이밍 설정
 * - ease: 부드러운 감속
 * - duration: 0.25초 (빠릿빠릿하게)
 */
export const pageTransition = {
  ease: 'easeOut' as const,
  duration: 0.25,
};

/**
 * 관리자 페이지용 전환 (더 미묘하게)
 * 라이트 테마라 너무 드라마틱하면 어색함
 */
export const adminPageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

export const adminPageTransition = {
  ease: 'easeOut' as const,
  duration: 0.2,
};
