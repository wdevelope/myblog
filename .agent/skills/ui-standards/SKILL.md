# UI/UX 표준 기술 (UI Standards Skill)

이 기술은 `myblog` 프로젝트의 시각적 일관성을 유지하고 프리미엄한 사용자 경험(UX)을 제공하기 위한 디자인 시스템과 구현 기법을 정의합니다.

## 1. 디자인 철학
- **Premium Aesthetic**: 기본 브라우저 스타일을 지양하며, 유리모피즘(Glassmorphism), 세련된 다크 모드, 부드러운 그라데이션을 적극 활용합니다.
- **Dynamic Interaction**: 호버 효과, 마이크로 애니메이션(Framer Motion 등), 부드러운 트랜지션을 통해 생동감 있는 인터페이스를 제공합니다.

## 2. Tailwind CSS v4 가이드

### 2.1 색상 및 그라데이션
- 단순한 `red`, `blue` 사용을 금하고 보색이나 파스텔 톤 등 조화로운 팔레트를 사용합니다.
- 문법 업데이트:
  - `bg-gradient-to-br` 대신 **`bg-linear-to-br`** 사용.
  - 투명도 조절: `bg-primary/10`, `text-muted/60` 등으로 깊이감 부여.

### 2.2 타이포그래피
- 제목(`h1`, `h2`): `tracking-tight`, `font-black` 또는 `font-bold`를 사용하여 존재감 부각.
- 본문(`p`, `div`): `leading-normal` (기존 `leading-[1.5]`)을 적용하여 가독성 확보.
- 메타데이터: `text-xs`, `text-muted`를 활용하여 계층 구조 명확화.

## 3. UI 컴포넌트 패턴

### 3.1 유리모피즘 (Glassmorphism)
- 카드나 모달 배경에 적용: `bg-background/80 backdrop-blur-md border border-border/50`.
- 그림자: `shadow-lg shadow-black/20`를 사용하여 부드러운 입체감 표현.

### 3.2 반응형 설계 (Mobile-First)
- 모바일에서 먼저 레이아웃을 잡고(`grid-cols-1`), 큰 화면(`lg:grid-cols-12`)으로 확장합니다.
- 터치 영역(`h-11`, `px-4`)을 충분히 확보하여 모바일 사용성을 높입니다.

## 4. 에이전트 체크리스트
- 새로운 UI 추가 시 `dark mode`에서도 시각적 피로감이 없는지 확인합니다.
- 버튼이나 링크에는 반드시 `transition`과 `hover/active` 상태를 정의합니다.
- `CkEditor`와 같은 외부 UI 라이브러리와 서비스의 전반적인 스타일 톤이 맞는지 검토합니다.
