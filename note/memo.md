1. 터미널에서 dev 서버 시작
IntelliJ IDEA 하단 터미널 탭 열고:
bashcd frontend
npm run dev
그러면 http://localhost:3000 에서 실행됨.
2. 브라우저로 확인
http://localhost:3000 접속하면 홈 화면 뜸.

백엔드(Spring Boot)도 함께 쓰려면:

Spring Boot는 8080 포트로 따로 실행 (IntelliJ에서 Run 버튼)
Vite가 /api, /ws 요청을 자동으로 8080으로 프록시해줘서 CORS 문제 없음

현재 상태는 mockData로 동작하니까 백엔드 없어도 프론트 UI 전부 확인 가능함.

IntelliJ에서 편하게 쓰는 팁:
package.json 파일 열면 좌측 ▶ 버튼이 dev, build 스크립트 옆에 생김 → 그걸 눌러도 됨.
또는 npm run dev를 IntelliJ Run Configuration으로 등록:

Run → Edit Configurations → + → npm → Script: dev → Working directory: frontend/


windows용 node_modules

cd frontend
npm install
npm run dev

npm run build


영화 api 활용 방안
영화 등록 시에 활용하면 편할 듯

https://gamzzang.tistory.com/128

TMDB
https://developer.themoviedb.org/reference/movie-popular-list

https://www.themoviedb.org/movie




++
관리자 페이지 고객페이지 오갈 수 있도록. 

권한 별 뷰 나누기

권한 설정 페이지 개설

회원 정보 조회 및 관리

키보드 문제 해결 (특히 한글)
키보드 자체 상단바에 입력된 글자가 보이면 더 좋을 듯


직원 권한

등록 x 영화 목록은 조회만 가능하게

---------------------------------------

api 명세서 작성 (엑셀)

 내장화

한글 키보드 조합 안됨 이슈 해결

상영관 필터 다시 적용  일반상영관 / 리클라이너 상영관

좌석 선택 개별로 변경 (현재 연속된 좌석 강제)

관리자 로그인 -> 대시보드가 아니라 영화 목록으로 가도록.

홈에 포스터 뜨게, 지금 그냥 색밖에 안 나옴

영화 상세페이지에서  -> 예매페이지로 넘어갈 때,  
상영관을 눌렀을 시 예매 페이지에서도 선택이 되어있도록

에매 페이지에서 날짜 선택은 필요 없음 (당일 예매만 가능하도록)

결제 창 진입 시 모달 -> 포인트 적립 유무를 묻는 창  -> y : n(skip) y일 때 y면  회원인증 (없으면 자동 가입) 전화번호 인증 받기 -> 

포인트 사용은 결제창에서 사용할 포인트 입력 받아 적용. 

모달 창이 닫혔을 때, 다시 열 수 있도록 버튼 추가


