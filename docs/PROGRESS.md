# Progress

อ้างอิง [REQUIREMENT.md](REQUIREMENT.md) ส่วน Roadmap การพัฒนาเบื้องต้น (Draft) สถานะด้านล่างเป็นภาพรวมสำหรับติดตามงาน ยังไม่ใช่ขอบเขตหรือกำหนดส่งที่ยืนยันแล้ว Phase 1 มีแอปและ mock data แล้ว แต่ยังไม่เชื่อมต่อ Firebase จริง

สถานะที่ใช้: `Not started` · `In progress` · `Done`

## Open work index

| งาน                                                                             | สถานะ       | เป้าหมายคร่าว ๆ                                                          |
| ------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| [Phase 1 — Foundation & Timeline Engine](#phase-1--foundation--timeline-engine) | In progress | แอปและ timeline จาก mock data พร้อม; รอ Firebase จริงและตรวจหน้าจอด้วยตา |
| [Phase 2 — Database & Back Office](#phase-2--database--back-office)             | Not started | จัดการข้อมูล lore และ workflow การเผยแพร่                                |
| [Phase 3 — Public Explorer](#phase-3--public-explorer)                          | Not started | ให้ผู้ใช้ค้นหา กรอง และสำรวจ timeline                                    |
| [Phase 4 — Interaction & Polish](#phase-4--interaction--polish)                 | Not started | ปรับการใช้งาน การจัดวาง และประสิทธิภาพ                                   |
| [Phase 5 — Advanced Lore Features](#phase-5--advanced-lore-features)            | Not started | เพิ่มเครื่องมือสำรวจ lore ขั้นสูง                                        |

## Phase 1 — Foundation & Timeline Engine

**สถานะ:** In progress

- [x] ตั้งค่า React, TypeScript, Vite, Tailwind CSS และธีมสำหรับหน้า public
- [x] สร้าง timeline จาก mock data ที่เลื่อนและซูมได้ พร้อมปุ่มควบคุมแบบไม่ต้องลาก
- [x] แสดง point, range, break ที่ย่อช่วงเวลา, image card และ dialog รายละเอียดเหตุการณ์
- [x] เตรียม Firebase SDK และ optional initializer ที่ไม่ต้องมี credentials เพื่อรัน mock data
- [ ] เมื่อมี Firebase project: ใส่ค่าจริงใน `.env.local` และตรวจการ initialize กับ project นั้น
- [ ] ตรวจหน้าจอจริงด้วยตาที่ขนาดมือถือและเดสก์ท็อป รวมถึงการลาก ซูม เปิด/ปิด dialog และ keyboard focus
- [ ] แทน mock dates, descriptions และภาพตัวอย่างด้วยข้อมูล lore ที่มีแหล่งอ้างอิง (ต่อเนื่องกับ Phase 2)

## Phase 2 — Database & Back Office

**สถานะ:** Not started

- ออกแบบ Firestore schema และตั้งค่า Authentication สำหรับ back office ส่วนตัว
- จัดการ event, character, era, region, source และความสัมพันธ์ระหว่างข้อมูล
- ทำ timeline editor และ workflow draft/publish

## Phase 3 — Public Explorer

**สถานะ:** Not started

- ทำ landing page, search, filter และมุมมอง world, character, era/region บนข้อมูลร่วมกัน
- เพิ่ม deep link ของ event, responsive UI และการแสดงระดับความแน่นอนของ lore

## Phase 4 — Interaction & Polish

**สถานะ:** Not started

- เพิ่ม animation, focus character และการเน้นความสัมพันธ์ของเหตุการณ์
- ปรับ auto layout ไม่ให้ card ทับกัน พร้อม performance และ accessibility

## Phase 5 — Advanced Lore Features

**สถานะ:** Not started

- เพิ่ม relationship explorer, compare characters, story mode และ spoiler controls
- รองรับ import/export ข้อมูลตามขอบเขตที่จะกำหนดในภายหลัง
