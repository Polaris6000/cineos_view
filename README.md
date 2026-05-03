# cinemaKiosk

> 영화관 무인 키오스크 풀스택 웹 애플리케이션

![Spring Boot](https://img.shields.io/badge/Spring_Boot_3.5-6DB33F?style=flat&logo=spring-boot&logoColor=white)
![Java](https://img.shields.io/badge/Java_21-ED8B00?style=flat&logo=openjdk&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-003545?style=flat&logo=mariadb&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?style=flat&logo=springsecurity&logoColor=white)
![Spring AI](https://img.shields.io/badge/Spring_AI_1.1-6DB33F?style=flat&logo=spring&logoColor=white)

---

## 📋 목차

- [프로젝트 소개](#프로젝트-소개)
- [빠른 시작 (Quick Start)](#빠른-시작-quick-start)
- [기술 의사결정](#기술-의사결정)
- [시스템 아키텍처](#시스템-아키텍처)
- [주요 기능](#주요-기능)
- [데이터베이스 설계](#데이터베이스-설계)
- [시퀀스 다이어그램](#시퀀스-다이어그램)
- [기술 스택](#기술-스택)
- [API 명세서](#api-명세서)
- [환경 변수 설정](#환경-변수-설정)
- [프로젝트 구조](#프로젝트-구조)
- [팀 문서](#팀-문서)
- [라이선스](#라이선스)

---

## 프로젝트 소개

### 만들게 된 이유

> ✏️ " 두 번째 프로젝트로, 첫 번째 프로젝트에서 서블렛으로 구현을 했기때문에 수업을 통해 배우기만 하고 직접 활용해보지 못했던 JPA를 실제로 써보고 싶었습니다.
> 여기에 더해 Spring AI, Spring Security(JWT), Spring Batch, WebSocket 등 관심 있던 기술들을 한 프로젝트 안에서 함께 익혀보는 것을 목표로 했습니다.
> 프론트엔드도 React를 이번에 처음 적용해보았으며, 백엔드와 프론트엔드를 분리하여 각자 담당해 개발했습니다.
> 주제는 실시간 좌석 선점, 주기적인 배치 실행, 외부 API를 통한 영화 정보 및 이미지 연동 등 다양한 기술을 자연스럽게 녹일 수 있는 영화관 키오스크로 선정했습니다. "

### 프로젝트 개요

**cinemaKiosk**는 Spring Boot + React 기반의 영화관 무인 키오스크 풀스택 웹 애플리케이션입니다.

고객은 영화 조회 → 스케줄 확인 → 실시간 좌석 선택 → SMS 본인인증 → 토스페이먼츠 결제까지 하나의 흐름으로 예매를 완료할 수 있으며, 관리자는 별도 대시보드에서 영화·스케줄·정책·통계 등 전반적인 운영을
담당합니다.

Spring Batch를 통한 자동 통계 집계 및 회원 관리, Spring AI(RAG)를 통한 직원 교육용 AI 챗봇, WebSocket 기반 실시간 좌석 점유 기능을 포함합니다.

---

## 빠른 시작 (Quick Start)

### 사전 요구사항

| 항목      | 버전  | 비고                                                                                  |
|---------|-----|-------------------------------------------------------------------------------------|
| Java    | 21+ | [다운로드](https://adoptium.net/)                                                       |
| Node.js | 18+ | [다운로드](https://nodejs.org/)                                                         |
| MariaDB | 8+  | [다운로드](https://mariadb.org/download/)                                               |
| Docker  | 최신  | PostgreSQL + PGVector 실행용 / [다운로드](https://www.docker.com/products/docker-desktop/) |

### API 키 발급 (필수)

프로젝트 실행 전 아래 외부 서비스 키를 미리 발급받아 두세요.

| 서비스          | 발급 링크                                                                  | 용도               |
|--------------|------------------------------------------------------------------------|------------------|
| 토스페이먼츠       | [developers.tosspayments.com](https://developers.tosspayments.com/)    | 카드 결제 / 환불       |
| 누리고 (Solapi) | [solapi.com](https://solapi.com/)                                      | SMS OTP / 영수증 발송 |
| TMDB         | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) | 영화 정보 조회         |
| OpenAI       | [platform.openai.com/api-keys](https://platform.openai.com/api-keys)   | 임베딩 / 챗봇         |

### 실행 순서

**1. 저장소 클론**

```bash
git clone https://github.com/your-username/cinemaKiosk.git
cd cinemaKiosk
```

**2. 데이터베이스 초기화**

```bash
# MariaDB 스키마 및 초기 데이터 생성
mysql -u root -p < src/main/resources/DB/init.sql
mysql -u root -p cinema_kiosk < src/main/resources/DB/data.sql
```

**3. PostgreSQL + PGVector (Docker)**

```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

**4. 환경 변수 설정**

```bash
cd cinemaKiOsk
cp .env.example .env
# .env 파일을 열어 발급받은 API 키들을 입력하세요
```

> `.env` 파일 작성 방법은 [환경 변수 설정](#환경-변수-설정) 섹션을 참고하세요.

**5. 백엔드 실행**

```bash
./gradlew bootRun
```

서버 기동 후 Swagger UI: `http://localhost:8080/swagger-ui/index.html`

**6. 프론트엔드 실행**

```bash
cd cineos_view
npm install
npm run dev
```

키오스크 / 관리자 UI: `http://localhost:3000`

---

## 기술 의사결정

프로젝트를 진행하며 내린 주요 기술 선택의 이유를 기록합니다.

### JPA + MyBatis 혼용

JPA만으로도 대부분의 CRUD는 처리할 수 있지만, 여러 테이블을 JOIN하는 복잡한 조회 쿼리는 JPA의 연관관계 설정이 까다롭고 처음 다루는 입장에서 제어가 어려웠습니다. 이번 프로젝트에서 JPA를 처음
사용해보는 것이기도 해서, **단순 CRUD는 JPA로, 복잡한 조회나 집계 쿼리는 SQL을 직접 제어할 수 있는 MyBatis로** 역할을 분리하는 방식을 선택했습니다.

### WebSocket — Stomp 미사용

> ✏️ **[작성 필요]** 순수 WebSocket을 선택하고 Stomp를 사용하지 않은 이유를 구현 담당자에게 확인 후 작성해주세요.

### JWT AccessToken / RefreshToken 이중 관리 구조

JWT를 처음 접했을 때는 AccessToken과 RefreshToken을 같은 저장소에서 함께 관리하는 것으로 알고 있었습니다.
이번 프로젝트를 통해 AccessToken은 메모리(ViewData)에, RefreshToken은 httpOnly Cookie와 DB에 분리 저장하는 구조를 직접 구현하며 그 이유를 이해했습니다.
AccessToken을 메모리에만 두면 XSS로 탈취되더라도 페이지 이탈 시 사라지고, RefreshToken을 DB에도 저장하면 서버 측에서 강제 만료가 가능해집니다.

자동 로그인 구현 시에도 새로운 점을 발견했습니다.
기존에 세션 방식으로 자동 로그인을 구현할 때는 UUID 값을 쿠키에 담아 서버의 세션과 대조하는 방식을 사용했는데,
JWT에서는 RefreshToken 자체가 그 역할을 대신한다는 것을 이번에 처음 깨달았습니다.
일반 로그인과 자동 로그인의 차이를 RefreshToken 만료 기간(1일 vs 30일)으로만 구분하면 된다는 점이 인상적이었습니다.

### (추가 의사결정 항목)

> ✏️ **[작성 필요]** 그 외 기술 선택, 트러블슈팅 경험이 있다면 이곳에 추가해주세요.

---

## 시스템 아키텍처

```mermaid
graph TD
    subgraph Client["Client Layer"]
        K["키오스크\n(React 19 + Vite)"]
        A["관리자 웹\n(React 19 + Vite)"]
    end

    subgraph Server["Spring Boot 3.5 (Java 21)"]
        API["REST API\nControllers"]
        WS["WebSocket\n(실시간 좌석)"]
        BATCH["Spring Batch\n(통계/회원 자동화)"]
        SVC["Service / Business Logic"]
        AI["Spring AI\n(RAG)"]
    end

    subgraph DB["Database"]
        MARIA["MariaDB\n(주 DB)"]
        PG["PostgreSQL + PGVector\n(Docker, 벡터 DB)"]
    end

    subgraph External["외부 API"]
        TOSS["토스페이먼츠\n(결제/환불)"]
        SMS["누리고\n(OTP/영수증)"]
        TMDB["TMDB API\n(영화 정보)"]
        OPENAI["OpenAI\n(Embedding/Chat)"]
    end

    K -->|HTTP REST / WebSocket| API
    A -->|HTTP REST| API
    API --> SVC
    WS --> SVC
    BATCH --> SVC
    SVC --> AI
    SVC --> MARIA
    AI --> PG
    SVC --> TOSS
    SVC --> SMS
    SVC --> TMDB
    AI --> OPENAI
```

---

## 주요 기능

### 고객 (키오스크)

- 현재 상영 중인 영화 목록 및 상세 정보 조회 (TMDB 연동)
- 상영 스케줄 및 상영관 확인
- 실시간 좌석 선택 (WebSocket 기반 실시간 점유 상태 반영)
- SMS OTP 휴대폰 인증 (누리고 API)
- 토스페이먼츠 카드 결제 / 포인트 전액 결제
- 쿠폰 적용 및 회원 등급별 할인 적용
- 예매 완료 후 SMS 영수증 발송
- 포인트 적립 및 사용

### 관리자 (웹 대시보드)

- JWT 기반 로그인 (일반 / 자동 로그인), 권한별 접근 제어 (12종 역할)
- TMDB API 연동 영화 검색 및 등록 (이미지 포함)
- 영화 / 스케줄 / 상영관 / 좌석 정책 CRUD
- 할인 정책 관리 (TIME / AGE / JOB / COUPON 유형), 쿠폰 발행
- 적립 정책(보너스 정책) 관리
- 결제 내역 조회 및 환불 처리 (토스페이먼츠 Cancel API)
- 회원 조회 및 포인트 내역 조회
- 통계 대시보드 (월 / 일 / 시간 / 영화별 매출 및 관람객 수)
- 활동 로그 조회
- Spring AI ETL 파이프라인 및 RAG 챗봇 관리

### Spring Batch (자동화)

- **statisticsJob** : 매일 자정, 전일 스케줄별 매출 / 관람객 수를 `statistics` 테이블에 집계
- **memberCleanupJob** : 매일 자정, 2가지 Step 순차 실행
    - Step 1 (`memberCleanupStep`) : 포인트 내역이 2년 이상 없는 회원의 전화번호를 `DEL_전화번호_시간` 형태로 마스킹 (100건 청크 단위 처리)
    - Step 2 (`demoteStep`) : VIP 등급 회원 중 1달간 포인트 내역이 없는 경우 NORMAL로 강등

### Spring Security (JWT)

| 구분                    | 저장 위치                | 만료 시간 |
|-----------------------|----------------------|-------|
| AccessToken           | ViewData (메모리)       | 30분   |
| RefreshToken - 일반 로그인 | httpOnly Cookie + DB | 1일    |
| RefreshToken - 자동 로그인 | httpOnly Cookie + DB | 30일   |

- RefreshToken은 DB에 저장하여 정상 발급 여부를 대조 검증
- 관리자 API (`/api/admin/**`) 전체에 JWT 인증 적용
- 12종 역할(ROLE) 기반 권한 관리 (ROLE_REFUND, ROLE_MOVIE_REG 등)
- Spring Security Filter Chain: `APILoginFilter` → `TokenCheckFilter` → `RefreshTokenFilter`

### Spring AI (ETL Pipeline + RAG)

직원 교육용 AI 챗봇으로, ETL 파이프라인을 통해 문서를 벡터 DB(PGVector)에 저장하고 RAG 방식으로 질의응답합니다.

**지원 ETL 입력 형식**

- 파일 업로드: `.txt`, `.json`, `.doc`, `.docx` (Apache Tika 기반)
- URL 추출: JSON URL에서 형식이 맞는 경우 자동 파싱

**RAG 동작 방식**

1. ETL로 문서를 청크 분할 → `text-embedding-3-small`로 임베딩 → PGVector 저장
2. 질문 입력 → 유사도 검색 (threshold 0.3) → GPT-4o-mini로 답변 생성
3. `conversationId` 기반 대화 히스토리 유지 (JDBC Chat Memory)

### WebSocket (실시간 좌석)

- 고객이 좌석 선택 시 WebSocket 연결 후 실시간 점유 상태 구독
- 결제 완료 시 서버가 해당 좌석 상태를 브로드캐스팅하여 다른 사용자에게 즉시 반영
- 세션 종료 시 구독 자동 해제 (Stomp 미사용, 순수 WebSocket)

---

## 데이터베이스 설계

### ERD

![ERD](https://github.com/user-attachments/assets/c247ef73-b5a7-4aab-82db-b5640ff22d7a)

### MariaDB (`cinema_kiosk`)

```
admin              - 관리자 계정 (level: 마스터=0, 알바=1, RefreshToken 관리)
admin_role         - 권한 종류 (12개 고정, ROLE_REFUND, ROLE_MOVIE_REG 등)
admin_role_map     - 관리자-권한 매핑 테이블

member             - 회원 (PK: phone, grade: NORMAL/VIP, point)
seat_policy        - 좌석 정책 (좌석 종류별 가격)
bonus_policy       - 포인트 적립 정책 (적립 비율, 기간, 활성화 여부)
discount_policy    - 할인 정책 (RATIO/WON, TIME/AGE/JOB/COUPON 유형)
coupon             - 쿠폰 내역 (할인 정책 FK, 사용 여부)
movie              - 영화 (등급: ALL/12/15/19, 배우는 쉼표 구분)
theater            - 상영관 (좌석 정책 FK, 정리 시간)
schedule           - 상영 스케줄 (상영관+영화 FK, 활성화 여부)
reservation_details - 예매 내역 (PK: UUID, schedule FK, member phone FK)
reservation_seat   - 예매 좌석 (예매 내역 FK, 좌석 번호)
payment_details    - 결제 내역 (PK: UUID, 쿠폰/적립정책 FK, PAY/RETURN/FAIL)
point_history      - 포인트 내역 (EARN/USE/REFUND_EARN/REFUND_USE)
statistics         - 일별 통계 (schedule FK, 요일, 매출, 관람객 수, 날짜)
```

### PostgreSQL + PGVector (Docker) — `rag` schema

- `vector_store` : Spring AI 문서 청크 + 임베딩 벡터 저장
- `chat_memory` (JDBC Chat Memory) : 대화 히스토리 저장

### ERD 관계 요약

```
admin ──< admin_role_map >── admin_role

member ──< point_history
member ──< reservation_details ──< reservation_seat
                               ──< payment_details ──< point_history
                                                    ── bonus_policy
                                                    ── coupon ── discount_policy

movie ──< schedule ──< reservation_details
theater ── seat_policy
theater ──< schedule ──< statistics
```

---

## 시퀀스 다이어그램

### 고객 예매 흐름

```mermaid
sequenceDiagram
    autonumber
    box "사용자 단말"
    participant User as 사용자
    participant App as 키오스크
    end
    box "메인 서버"
    participant Data as 데이터 모듈
    participant WebSocket as 웹소켓 모듈
    participant SMS as 문자메시지 모듈
    participant Error as 에러 처리 모듈
    end
    box "외부 API"
    participant Pay as 토스페이
    end

    Note over User, App: [1단계] 영화 및 좌석 탐색
    User ->> App: 영화 정보 검색
    App ->> Data: 영화 정보 요청 (JPA/MyBatis)
    Data -->> App: 영화 정보 응답
    Note over App: 실시간 좌석 선점을 위해 웹소켓 연결
    App ->> WebSocket: 실시간 점유 상태 구독 요청
    WebSocket -->> App: 구독 승인 완료

    rect rgb(240, 248, 255)
    Note over User, Data: [2단계] 사용자 인증 (SMS OTP)
    User ->> App: 좌석 선택 및 핸드폰 번호 입력
    App ->> Data: OTP 발송 요청
    Data ->> SMS: OTP 생성 및 발송 위임
    SMS -->> User: 인증번호 문자 발송
    User ->> App: 인증번호 입력
    App ->> Data: 인증번호 검증 요청
    Data -->> App: 인증 성공
    end

    rect rgb(255, 245, 245)
    Note over App, Pay: [3단계] 결제 프로세스
    App ->> Data: 결제 요청
    Data ->> Pay: 결제 승인(Confirm) API 호출
    Pay -->> Data: 결제 상태 응답 (SUCCESS/FAIL)
    alt 결제 성공
        Data ->> Data: DB 트랜잭션 처리 (예약 확정)
        Data ->> WebSocket: 좌석 상태 업데이트 브로드캐스팅
        Data -->> App: 결제 성공 응답 및 티켓 정보
        Data ->> SMS: 예매 완료 알림톡 발송
    else 결제 실패
        Data ->> Error: 결제 실패 로그 저장
        Error -->> Data: 에러 코드 반환
        Data -->> App: 결제 실패 알림
    end
    end
    App --X WebSocket: 세션 종료 및 구독 해제
```

### 관리자 흐름

```mermaid
sequenceDiagram
    autonumber
    box "관리자 단말"
        participant Admin as 관리자
        participant App as 웹 페이지 (React)
    end
    box "메인 서버"
        participant Auth as 인증 모듈 (Spring Security)
        participant Data as 데이터 모듈 (Service/DB)
    end
    box "외부 API"
        participant TMDB as TMDB API
        participant Pay as 토스페이 API
    end

    Note over Admin, Auth: [1단계] 보안 로그인
    Admin ->> App: 로그인 정보 입력
    App ->> Auth: JWT 인증 요청
    alt 인증 성공
        Auth -->> App: AccessToken 발급 (ViewData 저장, 30분)
        Note right of App: RefreshToken → httpOnly Cookie + DB 저장
    else 인증 실패
        Auth -->> App: 401 Unauthorized
    end

    rect rgb(230, 255, 230)
        Note over Admin, TMDB: [2단계] 영화 데이터 수집 및 등록
        Admin ->> App: 영화 키워드 검색
        App ->> Data: 검색 요청
        Data ->> TMDB: API 호출 (Movie Search)
        TMDB -->> Data: 영화 리스트 반환
        Data -->> App: 검색 결과 표시
        Admin ->> App: 등록할 영화 선택
        App ->> Data: DB 저장 요청
        Data -->> App: 등록 완료
    end

    rect rgb(255, 240, 240)
        Note over Admin, Pay: [3단계] 결제 취소 및 환불 처리
        Admin ->> App: 환불 대상 조회
        App ->> Data: 결제 내역 요청
        Data -->> App: 리스트 반환
        Admin ->> App: 특정 내역 환불 클릭
        App ->> Data: 환불 프로세스 시작
        Data ->> Pay: Cancel API 호출 (Toss Payments)
        alt API 환불 성공
            Pay -->> Data: 취소 승인 응답
            Data ->> Data: DB 상태 변경 (PAY → RETURN)
            Data -->> App: 환불 완료 알림
        else API 환불 실패
            Pay -->> Data: 에러 응답
            Data -->> App: 환불 실패 사유 전달
        end
    end
```

---

## 기술 스택

### Backend

| 분류        | 기술                                                     |
|-----------|--------------------------------------------------------|
| Language  | Java 21                                                |
| Framework | Spring Boot 3.5                                        |
| ORM       | Spring Data JPA + MyBatis 3.0.5                        |
| Security  | Spring Security + JWT (jjwt 0.12.6)                    |
| Batch     | Spring Batch                                           |
| AI        | Spring AI 1.1.4 (OpenAI, PGVector, RAG, Tika)          |
| Real-time | WebSocket (Spring WebSocket)                           |
| Build     | Gradle                                                 |
| DB        | MariaDB (주 DB) + PostgreSQL / PGVector (벡터 DB, Docker) |
| API Docs  | SpringDoc OpenAPI (Swagger UI)                         |
| Image     | Thumbnailator                                          |
| JSON      | Gson, Jackson                                          |

### Frontend

| 분류        | 기술                             |
|-----------|--------------------------------|
| Language  | TypeScript 6                   |
| Framework | React 19                       |
| Build     | Vite 6                         |
| Routing   | React Router DOM v7            |
| HTTP      | Axios                          |
| 상태관리      | React Context API              |
| 결제 SDK    | @tosspayments/tosspayments-sdk |
| Animation | Framer Motion                  |
| Icons     | Lucide React                   |

### 외부 API

| 서비스          | 용도                                                        |
|--------------|-----------------------------------------------------------|
| 토스페이먼츠       | 카드 결제 승인, 결제 취소(환불)                                       |
| 누리고 (Solapi) | SMS OTP 인증, 결제 영수증 발송                                     |
| TMDB API     | 영화 목록 검색, 상세 정보, 포스터 이미지                                  |
| OpenAI       | 텍스트 임베딩 (`text-embedding-3-small`), 답변 생성 (`gpt-4o-mini`) |

---

## API 명세서

> 🔗 Swagger UI (서버 실행 후 접속): `http://localhost:8080/swagger-ui/index.html`

### 인증

| Method | URL                 | 설명                     | 인증 |
|--------|---------------------|------------------------|----|
| POST   | `/api/admin/login`  | 관리자 로그인 (JWT 발급)       | ❌  |
| POST   | `/api/admin/logout` | 로그아웃 (RefreshToken 삭제) | ✅  |

---

### 고객 API (`/api`)

#### 영화

| Method | URL                            | 설명                | 인증 |
|--------|--------------------------------|-------------------|----|
| GET    | `/api/movie/all`               | 오늘 상영 중인 영화 목록 조회 | ❌  |
| GET    | `/api/movie/{movieId}/readOne` | 영화 단일 조회          | ❌  |

#### 스케줄

| Method | URL                        | 설명                         | 인증 |
|--------|----------------------------|----------------------------|----|
| GET    | `/api/schedule/list`       | 스케줄 전체 조회 (JPA)            | ❌  |
| GET    | `/api/schedule/DTOlist`    | 스케줄 전체 조회 (MyBatis Mapper) | ❌  |
| GET    | `/api/schedule/{id}/movie` | 지정 영화의 전체 스케줄 조회           | ❌  |

#### 상영관 / 좌석

| Method | URL                     | 설명            | 인증 |
|--------|-------------------------|---------------|----|
| GET    | `/api/theater/list`     | 상영관 전체 조회     | ❌  |
| GET    | `/api/theater/dtoAll`   | 상영관 DTO 전체 조회 | ❌  |
| GET    | `/api/seat-policy/list` | 좌석 정책 전체 조회   | ❌  |

#### 회원 / 포인트

| Method | URL                   | 설명              | 인증 |
|--------|-----------------------|-----------------|----|
| POST   | `/api/member/{phone}` | 회원 가입 (전화번호 기반) | ❌  |
| GET    | `/api/member/{phone}` | 회원 단일 조회        | ❌  |
| POST   | `/api/member/point`   | 포인트 사용 / 적립     | ❌  |

#### 쿠폰 / 할인

| Method | URL                      | 설명          | 인증 |
|--------|--------------------------|-------------|----|
| POST   | `/api/coupon/auth`       | 쿠폰 번호 검증    | ❌  |
| GET    | `/api/discount/age`      | 연령 할인 정책 조회 | ❌  |
| GET    | `/api/discount/time`     | 시간 할인 정책 조회 | ❌  |
| GET    | `/api/bonus-policy/list` | 적립 정책 전체 조회 | ❌  |

#### 결제

| Method | URL                    | 설명                       | 인증 |
|--------|------------------------|--------------------------|----|
| POST   | `/api/payment/confirm` | 토스페이먼츠 결제 승인 / 포인트 전액 결제 | ❌  |

#### SMS

| Method | URL                                         | 설명               | 인증 |
|--------|---------------------------------------------|------------------|----|
| POST   | `/api/sms/random/{toPhone}`                 | OTP 인증번호 생성 및 발송 | ❌  |
| POST   | `/api/sms/comparison/{toPhone}/{inputCode}` | 인증번호 검증          | ❌  |
| POST   | `/api/sms/{toPhone}/{inputCode}`            | 문자 직접 발송         | ❌  |
| POST   | `/api/sms/receipt/{toPhone}/{uuid}`         | 결제 영수증 SMS 발송    | ❌  |

#### 예매 / 좌석

| Method | URL                                                | 설명               | 인증 |
|--------|----------------------------------------------------|------------------|----|
| GET    | `/api/reservation/seatCount/schedule/{scheduleId}` | 스케줄의 예약된 좌석 조회   | ❌  |
| GET    | `/api/reservation/seatCount/movie/{movieId}`       | 영화별 예약된 좌석 전체 조회 | ❌  |

---

### 관리자 API (`/api/admin`) — 전체 JWT 인증 필요

#### 관리자 계정 / 권한

| Method | URL                         | 설명                |
|--------|-----------------------------|-------------------|
| GET    | `/api/admin/list`           | 전체 직원 및 권한 조회     |
| GET    | `/api/admin/role/list`      | 전체 권한 목록 조회       |
| GET    | `/api/admin/role/{loginId}` | 지정 관리자 권한 조회      |
| POST   | `/api/admin/role`           | 지정 관리자 권한 부여 / 제거 |

#### 영화 관리

| Method | URL                              | 설명                        |
|--------|----------------------------------|---------------------------|
| POST   | `/api/admin/movie/upload`        | 영화 등록 (이미지 포함, multipart) |
| PATCH  | `/api/admin/movie/modify`        | 영화 수정 (이미지 포함, multipart) |
| PATCH  | `/api/admin/movie/{movieId}/end` | 영화 상영 종료 처리               |
| GET    | `/api/admin/movie/readAll`       | 전체 영화 조회 (관리자)            |
| DELETE | `/api/admin/movie/remove`        | 영화 삭제                     |

#### TMDB 연동

| Method | URL                  | 설명            |
|--------|----------------------|---------------|
| GET    | `/api/tmdb/popular`  | TMDB 인기 영화 목록 |
| GET    | `/api/tmdb/search`   | TMDB 영화 검색    |
| GET    | `/api/tmdb/{tmdbId}` | TMDB 영화 상세    |

#### 스케줄 관리

| Method | URL                              | 설명            |
|--------|----------------------------------|---------------|
| POST   | `/api/admin/schedule`            | 스케줄 등록        |
| PUT    | `/api/admin/schedule`            | 스케줄 수정        |
| PATCH  | `/api/admin/schedule/activation` | 스케줄 활성화 상태 변경 |
| DELETE | `/api/admin/schedule/del`        | 스케줄 삭제        |
| GET    | `/api/admin/schedule/list`       | 스케줄 전체 조회     |
| GET    | `/api/admin/schedule/{id}`       | 스케줄 단일 조회     |
| GET    | `/api/admin/schedule/{id}/movie` | 영화별 스케줄 조회    |

#### 상영관 / 좌석 정책 관리

| Method | URL                            | 설명           |
|--------|--------------------------------|--------------|
| POST   | `/api/admin/theater`           | 상영관 등록       |
| GET    | `/api/admin/theater/list`      | 상영관 전체 조회    |
| GET    | `/api/admin/theater/{no}`      | 상영관 단일 조회    |
| PATCH  | `/api/admin/theater/policy`    | 상영관 좌석 정책 수정 |
| PATCH  | `/api/admin/theater/cleantime` | 상영관 정리 시간 수정 |
| POST   | `/api/admin/seat-policy`       | 좌석 정책 등록     |
| GET    | `/api/admin/seat-policy/list`  | 좌석 정책 전체 조회  |
| GET    | `/api/admin/seat-policy/{no}`  | 좌석 정책 단일 조회  |
| PATCH  | `/api/admin/seat-policy`       | 좌석 정책 수정     |
| DELETE | `/api/admin/seat-policy/{no}`  | 좌석 정책 삭제     |

#### 할인 정책 / 쿠폰 관리

| Method | URL                                             | 설명                  |
|--------|-------------------------------------------------|---------------------|
| POST   | `/api/admin/discount-policy`                    | 할인 정책 등록            |
| GET    | `/api/admin/discount-policy/list`               | 할인 정책 전체 조회         |
| GET    | `/api/admin/discount-policy/{id}`               | 할인 정책 단일 조회         |
| PATCH  | `/api/admin/discount-policy/activation`         | 할인 정책 활성화 / 비활성화 토글 |
| POST   | `/api/admin/discount-policy/coupon/{policyId}`  | 지정 정책에 쿠폰 발행        |
| GET    | `/api/admin/discount-policy/coupon/list`        | 쿠폰 전체 조회 (페이징)      |
| GET    | `/api/admin/discount-policy/coupon/{couponNum}` | 쿠폰 단일 조회            |
| GET    | `/api/admin/discount-policy/log`                | 할인 정책 로그 (페이징)      |

#### 적립 정책 관리

| Method | URL                                   | 설명                         |
|--------|---------------------------------------|----------------------------|
| POST   | `/api/admin/bonus-policy`             | 적립 정책 추가 / 수정              |
| PATCH  | `/api/admin/bonus-policy/{id}/finish` | 적립 정책 종료 (23:59 설정)        |
| PATCH  | `/api/admin/bonus-policy/finish-btn`  | 적립 정책 활성화 토글               |
| DELETE | `/api/admin/bonus-policy`             | 적립 정책 삭제                   |
| GET    | `/api/admin/bonus-policy/list`        | 적립 정책 전체 조회                |
| GET    | `/api/admin/bonus-policy/{grade}`     | 등급별 적립 정책 조회               |
| GET    | `/api/admin/bonus-policy/log`         | 적립 전체 로그 (페이징, size=10 고정) |

#### 회원 관리

| Method | URL                                    | 설명                 |
|--------|----------------------------------------|--------------------|
| GET    | `/api/admin/member/list`               | 회원 전체 조회 (페이징)     |
| GET    | `/api/admin/member/{phone}`            | 회원 단일 조회           |
| GET    | `/api/admin/member/{phone}/point-list` | 지정 회원 포인트 내역 전체 조회 |
| GET    | `/api/admin/member/point-list`         | 전체 포인트 내역 조회 (페이징) |

#### 결제 / 환불 관리

| Method | URL                              | 설명                           |
|--------|----------------------------------|------------------------------|
| GET    | `/api/admin/payment/list`        | 결제 내역 전체 조회 (페이징)            |
| GET    | `/api/admin/payment/read/{uuid}` | 결제 단일 조회                     |
| POST   | `/api/admin/payment/refund`      | 환불 처리 (토스페이먼츠 Cancel API 호출) |

#### 통계

| Method | URL                                | 설명      |
|--------|------------------------------------|---------|
| GET    | `/api/admin/statistics?type=MONTH` | 월별 통계   |
| GET    | `/api/admin/statistics?type=DAY`   | 일별 통계   |
| GET    | `/api/admin/statistics?type=HOUR`  | 시간대별 통계 |
| GET    | `/api/admin/statistics?type=MOVIE` | 영화별 통계  |

#### Spring AI (ETL / RAG)

| Method | URL                   | 설명                                             |
|--------|-----------------------|------------------------------------------------|
| POST   | `/api/admin/etl/file` | 파일 업로드 → ETL → PGVector 저장 (txt/json/doc/docx) |
| POST   | `/api/admin/etl/json` | JSON URL 추출 → ETL → PGVector 저장                |
| POST   | `/api/admin/rag/chat` | RAG 기반 AI 챗봇 질의 (대화 히스토리 유지)                   |

---

## 환경 변수 설정

프로젝트 루트(백엔드)에 `.env` 파일을 생성하세요.

```env
# JWT 시크릿 키 (임의의 긴 문자열)
JWT_KEY=your_jwt_secret_key_here

# 누리고 SMS API (https://solapi.com)
SMS_KEY=your_nurigo_api_key
SECRET_KEY=your_nurigo_secret_key
PHONE=your_sender_phone_number

# TMDB API (https://www.themoviedb.org/settings/api)
TMDB_API_KEY=your_tmdb_api_key

# OpenAI API (https://platform.openai.com/api-keys)
OPENAI_API_KEY=your_openai_api_key
```

`application.properties` 주요 설정 (`.env`에서 주입):

```properties
# MariaDB
spring.datasource.url=jdbc:mariadb://localhost:3306/cinema_kiosk
spring.datasource.username=task_master
spring.datasource.password=4444

# PostgreSQL + PGVector (Docker)
app.datasource.url=jdbc:postgresql://localhost:5432/postgres?currentSchema=rag,public
app.datasource.username=postgres
app.datasource.password=postgres

# OpenAI 모델
spring.ai.openai.embedding.options.model=text-embedding-3-small
spring.ai.openai.chat.options.model=gpt-4o-mini

# TMDB
tmdb.base-url=https://api.themoviedb.org/3
tmdb.image-url=https://image.tmdb.org/t/p/w500

# 파일 업로드
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=30MB
```

---

## 프로젝트 구조

```
cinemaKiosk/
├── cinemaKiOsk/                        # Spring Boot 백엔드
│   ├── src/main/java/com/example/cinemakiosk/
│   │   ├── batch/                      # Spring Batch Jobs
│   │   │   ├── BatchScheduler.java     # Cron 스케줄러 (자정 실행)
│   │   │   ├── StatisticConfig.java    # 일별 통계 집계 Job
│   │   │   ├── MemberConfig.java       # 회원 정리 + 등급 강등 Job
│   │   │   └── MemberCleanupWriter.java
│   │   ├── config/                     # 설정 클래스
│   │   │   ├── SecurityConfig.java     # Spring Security + JWT 필터 체인
│   │   │   ├── WebSocketConfig.java    # WebSocket 설정
│   │   │   ├── SwaggerConfig.java      # SpringDoc OpenAPI
│   │   │   ├── TmdbConfig.java         # TMDB API WebClient 설정
│   │   │   ├── FileUploadConfig.java   # 파일 업로드 설정
│   │   │   ├── CorsConfig.java         # CORS 설정
│   │   │   └── datasource/
│   │   │       ├── MariaDBConfig.java  # MariaDB DataSource
│   │   │       └── pgvector/
│   │   │           ├── PGVectorConfig.java      # PGVector DataSource
│   │   │           └── ChatMemoryConfig.java    # JDBC Chat Memory
│   │   ├── controller/                 # REST 컨트롤러
│   │   │   ├── CustomerController.java # 고객 통합 API
│   │   │   ├── AdminController.java    # 관리자 계정/권한
│   │   │   ├── MovieController.java    # 영화 관리 (Admin)
│   │   │   ├── TmdbController.java     # TMDB 연동
│   │   │   ├── ScheduleController.java # 스케줄 관리
│   │   │   ├── TheaterController.java  # 상영관/좌석 정책
│   │   │   ├── PaymentController.java  # 결제/환불
│   │   │   ├── ReservationController.java
│   │   │   ├── MemberController.java   # 회원 관리 (Admin)
│   │   │   ├── BonusPolicyController.java
│   │   │   ├── DiscountPolicyController.java
│   │   │   ├── SmsNurigoController.java # SMS OTP/영수증
│   │   │   ├── StatisticsController.java
│   │   │   └── aicontroller/
│   │   │       ├── EtlController.java  # ETL 파이프라인
│   │   │       └── RagController.java  # RAG 챗봇
│   │   ├── domain/                     # JPA Entity
│   │   │   ├── MemberEntity.java
│   │   │   ├── MovieEntity.java
│   │   │   ├── ScheduleEntity.java
│   │   │   ├── TheaterEntity.java
│   │   │   ├── PaymentDetailsEntity.java
│   │   │   ├── ReservationDetailsEntity.java
│   │   │   ├── ReservationSeatEntity.java
│   │   │   ├── PointHistoryEntity.java
│   │   │   ├── StatisticsEntity.java
│   │   │   ├── CouponEntity.java
│   │   │   ├── BonusPolicyEntity.java
│   │   │   ├── DiscountPolicyEntity.java
│   │   │   ├── SeatPolicyEntity.java
│   │   │   ├── admindomain/
│   │   │   │   ├── AdminEntity.java
│   │   │   │   ├── AdminRoleEntity.java
│   │   │   │   └── AdminRoleMapEntity.java
│   │   │   └── enums/
│   │   │       ├── Grade.java          # NORMAL, VIP
│   │   │       ├── Rating.java         # ALL, 12, 15, 19
│   │   │       ├── DiscountType.java   # RATIO, WON
│   │   │       ├── ConditionType.java  # TIME, AGE, JOB, COUPON
│   │   │       ├── Days.java           # 요일 Enum
│   │   │       └── AuthResult.java
│   │   ├── dto/                        # Data Transfer Objects
│   │   ├── vo/                         # Value Objects (MyBatis)
│   │   ├── service/                    # 비즈니스 로직
│   │   │   └── ai/
│   │   │       ├── ETLService.java     # ETL 파이프라인
│   │   │       └── RagService.java     # RAG 질의응답
│   │   ├── repository/                 # JPA Repository
│   │   ├── mapper/                     # MyBatis Mapper 인터페이스
│   │   ├── filter/                     # Security 필터
│   │   │   ├── APILoginFilter.java
│   │   │   ├── TokenCheckFilter.java
│   │   │   └── RefreshTokenFilter.java
│   │   ├── handler/                    # 로그인 성공 핸들러 / MyBatis 타입 핸들러
│   │   └── util/
│   │       └── JwtUtil.java
│   └── src/main/resources/
│       ├── DB/
│       │   ├── init.sql                # 테이블 생성 DDL
│       │   └── data.sql                # 초기 데이터 (admin_role 등)
│       ├── mapper/                     # MyBatis XML Mapper
│       └── application.properties
│
└── cineos_view/                        # React 프론트엔드
    └── src/
        ├── api/                        # Axios API 클라이언트
        │   ├── apiClient.ts            # Axios 인스턴스 (AccessToken 인터셉터)
        │   ├── aiApi.ts                # ETL / RAG API
        │   ├── discountApi.ts          # 할인 정책 API
        │   ├── tmdbApi.ts              # TMDB API
        │   ├── statsApi.ts             # 통계 API
        │   └── websocket.ts            # WebSocket 연결
        ├── components/
        │   ├── AiChatPanel/            # AI 챗봇 패널
        │   ├── Auth/PrivateRoute.tsx   # 인증 라우트 가드
        │   ├── Layout/
        │   │   ├── AdminLayout.tsx     # 관리자 레이아웃
        │   │   └── CustomerLayout.tsx  # 키오스크 레이아웃
        │   ├── Stats/                  # 통계 탭 네비게이션
        │   └── Toast/GlobalToast.tsx   # 전역 토스트
        ├── context/
        │   ├── AuthContext.tsx         # 관리자 인증 상태 (AccessToken 관리)
        │   └── IdleTimerContext.tsx    # 키오스크 유휴 타이머
        ├── hooks/
        │   └── useWebSocket.ts         # WebSocket 훅
        ├── pages/
        │   ├── movie/                  # 홈, 영화 목록, 영화 상세
        │   ├── booking/                # 스케줄 선택, 좌석 선택
        │   ├── payment/                # 결제, 결제 결과
        │   ├── admin/
        │   │   ├── login/              # 관리자 로그인
        │   │   ├── management/         # 영화, 스케줄, 상영관, 회원, 결제, 정책, ETL 관리 페이지
        │   │   └── statistics/         # 통계 대시보드 (일/월/시간/영화별)
        │   └── error/                  # 404, 500 페이지
        ├── store/
        │   └── seatLayoutStore.ts      # 좌석 배치 전역 상태
        ├── config/
        │   └── theaterConfig.ts        # 상영관 좌석 구성 설정
        └── utils/
            ├── seatUtils.ts
            ├── seatWebSocket.ts        # 좌석 WebSocket 유틸
            └── seatId.ts
```

---

## 팀 문서

> ✏️ **[작성 필요]** 유스케이스 명세서, 기획 문서 등 팀 문서가 있다면 아래에 링크를 추가해주세요.

| 문서         | 링크                                                                                                 |
|------------|----------------------------------------------------------------------------------------------------|
| 유스케이스 명세서  | [링크](https://docs.google.com/document/d/1kTD8A6RrQe-xDvIrj8cqbpsOa_vISxIrA7Gs83PyrOk/edit?tab=t.0) |
| 기획 / 설계 문서 | [링크 추가 예정]                                                                                         |

---

## 라이선스

MIT License

---

<p align="center">cinemaKiosk — Built with Spring Boot & React</p>
