# 🚀 초간단 실행 가이드

**딱 5분이면 됩니다! 하나씩 따라하세요.**

---

## 📦 준비물 체크리스트

다음 3개가 설치되어 있나요?

- [ ] Python (3.8 이상)
- [ ] Node.js (16 이상)
- [ ] Git

**없으면?**
- Python 👉 https://www.python.org/downloads/ (설치할 때 **"Add to PATH"** 체크!)
- Node.js 👉 https://nodejs.org/ (LTS 버전)
- Git 👉 https://git-scm.com/

---

## 🎯 따라하기 (Windows 기준)

### 1️⃣ 프로젝트 받기
```cmd
git clone [GitHub 주소]
cd ai-analytics-platform
```

### 2️⃣ 백엔드 준비
```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

### 3️⃣ MongoDB 설정
`.env` 파일을 메모장으로 열어서:
```
MONGO_URI=mongodb+srv://[여기에 본인 MongoDB 주소 입력]
```

### 4️⃣ 프론트엔드 준비
**새 터미널 창 열기!**
```cmd
cd frontend
npm install
cd ..
```

### 5️⃣ 실행하기
**터미널 1:**
```cmd
start-backend.bat
```

**터미널 2:**
```cmd
start-frontend.bat
```

### 6️⃣ 브라우저 열기
http://localhost:3000

---

## ❓ 자주 묻는 질문

**Q: 'python'을 찾을 수 없다고 나와요**
> A: Python 설치 후 컴퓨터 재시작하세요

**Q: 포트가 이미 사용중이래요**
> A: 다른 프로그램이 3000 또는 8001 포트를 쓰고 있어요. 그 프로그램을 끄세요.

**Q: MongoDB 연결이 안돼요**
> A: MongoDB Atlas에서 IP 허용 목록에 본인 IP를 추가했나요?

**Q: npm install이 오래 걸려요**
> A: 정상입니다. 5-10분 걸릴 수 있어요.

---

## 🎉 성공!

이제 사용할 수 있습니다:
1. 회원가입하기
2. 로그인하기
3. AI에게 질문하기

예시: "최근 가장 인기있는 상품은 뭐야?"

---

**여전히 안되면?** 👉 [상세 문서 보기](README.md)