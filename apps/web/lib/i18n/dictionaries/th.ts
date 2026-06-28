import type { Dictionary } from "./en";

/** Thai translations — must match the shape of the English dictionary exactly. */
export const th: Dictionary = {
    meta: {
        title: "Skills Lector",
        description: "เรียกดูและตรวจสอบ Claude Skills ที่ติดตั้งบนเครื่องนี้",
    },

    nav: {
        brand: "Skills Lector",
        skills: "สกิล",
        commands: "คำสั่ง",
        hooks: "ฮุก",
        presets: "พรีเซ็ต",
        analytics: "วิเคราะห์",
        graph: "กราฟ",
        sources: "แหล่งที่มา",
        usecase: "วิธีใช้",
        discover: "ค้นพบ",
        cheats: "โพย",
        flow: "โฟลว์",
    },

    language: {
        label: "ภาษา",
    },

    theme: {
        toLight: "สลับเป็นโหมดสว่าง",
        toDark: "สลับเป็นโหมดมืด",
    },

    font: {
        label: "ฟอนต์",
    },

    actions: {
        rescan: "สแกนใหม่",
        scanning: "กำลังสแกน…",
        scanningHint: "กำลังรีเฟรชสกิล คำสั่ง ฮุก และกิจกรรม…",
        copy: "คัดลอก",
        copied: "คัดลอกแล้ว",
        copyToClipboard: "คัดลอกไปยังคลิปบอร์ด",
        showMore: "แสดงเพิ่มเติม",
        showLess: "แสดงน้อยลง",
        previous: "ก่อนหน้า",
        next: "ถัดไป",
    },

    common: {
        never: "ไม่เคย",
        unknown: "ไม่ทราบ",
        justNow: "เมื่อสักครู่",
        loadingGraph: "กำลังโหลดกราฟ…",
        loadingPipeline: "กำลังโหลดไปป์ไลน์…",
        allProjects: "ทุกโปรเจ็กต์",
        filterByProject: "กรองตามโปรเจ็กต์",
        page: (current, total) => `หน้า ${current} จาก ${total}`,
    },

    skillTypes: {
        personal: "ส่วนตัว",
        plugin: "ปลั๊กอิน",
        project: "โปรเจ็กต์",
        local: "ในเครื่อง",
    },

    scan: {
        line: (date, ms, platform) => `สแกนเมื่อ ${date} · ${ms} ms · ${platform}`,
        transcripts: (date, count) =>
            `สแกนเมื่อ ${date} · ${count} ทรานสคริปต์`,
        errors: (count) => `มี ${count} พาธที่อ่านไม่ได้ระหว่างการสแกน`,
    },

    dashboard: {
        title: "สกิลที่ติดตั้ง",
        subtitle:
            "ทุก Claude Skill ที่พบบนเครื่องนี้ — อยู่ที่ไหน มาจากไหน และเปลี่ยนแปลงล่าสุดเมื่อใด",
        emptyTitle: "ไม่พบสกิล",
        empty1: "ไม่พบสิ่งใดภายใต้ ",
        empty2:
            " หรือตำแหน่งสแกนเริ่มต้นอื่น ๆ ชี้สแกนเนอร์ไปยังไดเรกทอรีโดยเพิ่มรายการ ",
        empty3: " ลงใน ",
        empty4: " แล้วกดสแกนใหม่",
    },

    commandsPage: {
        title: "คำสั่งที่ติดตั้ง",
        subtitle:
            "ทุกคำสั่งสแลช Claude Code ที่พบบนเครื่องนี้ — อยู่ที่ไหน มาจากไหน และเปลี่ยนแปลงล่าสุดเมื่อใด",
        emptyTitle: "ไม่พบคำสั่ง",
        empty1: "ไม่พบไฟล์ ",
        empty2: " ของคำสั่งสแลชภายใต้ ",
        empty3: ", ปลั๊กอินที่ติดตั้ง, หรือไดเรกทอรี ",
        empty4: " ของโปรเจ็กต์ที่รู้จัก เพิ่มไฟล์คำสั่งแล้วกดสแกนใหม่",
    },

    hooksPage: {
        title: "ฮุกที่ตั้งค่าไว้",
        subtitle:
            "ทุก hook ของ Claude Code ที่ประกาศบนเครื่องนี้ — รันใน lifecycle event ใด ใช้คำสั่งอะไร และประกาศไว้ในไฟล์ settings ใด",
        emptyTitle: "ไม่มี hook ที่ตั้งค่าไว้",
        empty1: "ไม่พบรายการ ",
        empty2: " ในไฟล์ settings ส่วนตัว ",
        empty3: ", settings ของปลั๊กอิน, หรือไฟล์ ",
        empty4: " ของโปรเจ็กต์ที่รู้จัก ตั้งค่า hook ผ่านเมนู /hooks ของ Claude Code (หรือแก้ settings.json ด้วยมือ) แล้วกดสแกนใหม่",
        unnamedMatcher: "(ใด ๆ)",
        exampleHeading: "เริ่มต้นเร็ว — ลองตัวอย่างนี้",
        exampleIntro:
            "ตัวอย่าง 5 hook ครอบคลุมทุกหมวดที่ stat cards ด้านบนนับ คัดลอก JSON แล้ววางลงในไฟล์ settings อันใดอันหนึ่งข้างล่าง จากนั้นกดสแกนใหม่",
        exampleCopyLabel: "ตัวอย่าง settings.json",
        exampleInstallPersonal: "ส่วนตัว (ทุกเซสชัน): ",
        exampleInstallProject: "โปรเจ็กต์ (commit ได้): ",
        exampleInstallLocal: "โปรเจ็กต์ในเครื่อง (git-ignored): ",
    },

    presetsPage: {
        title: "พรีเซ็ต",
        subtitle: "รวม skills และ commands เป็นชุดสำหรับงานแต่ละแบบ",
        newPreset: "สร้างใหม่",
        rescan: "รีเฟรช",
        activeCard: {
            active: "ใช้งาน",
            itemsCount: (n: number) => `${n} รายการ`,
            activated: (ago: string) => `เปิดใช้เมื่อ ${ago}`,
            viewDetail: "ดูรายละเอียด",
            reapply: "ใช้ซ้ำ",
        },
        tabs: {
            active: (n: number) => `ใช้งาน (${n})`,
            archived: (n: number) => `เก็บถาวร (${n})`,
        },
        pinnedPanel: {
            title: "ตรึงไว้ (เปิดตลอด)",
            manage: "จัดการ",
            empty: "ยังไม่มีรายการตรึง",
            add: "เพิ่มตรึง",
        },
        empty: {
            heading: "ยินดีต้อนรับ — มาสร้างพรีเซ็ตแรกกัน",
            body: "พรีเซ็ตคือชุดของ skills และ commands ที่ต้องการเปิดใช้สำหรับงานแบบหนึ่ง การสลับพรีเซ็ตจะ toggle flag model-invocation ของแต่ละรายการ ไม่มี side effect อื่น",
        },
        wizard: {
            stepName: "ตั้งชื่อ workflow",
            stepItems: "เลือกรายการ",
            stepReview: "ตรวจสอบ",
            namePlaceholder: "debugging",
            slugLabel: "Slug (URL-safe)",
            descPlaceholder: "พรีเซ็ตนี้ใช้สำหรับอะไร?",
            cancel: "ยกเลิก",
            next: "ถัดไป",
            back: "ย้อนกลับ",
            save: "บันทึก",
            saveAndActivate: "บันทึก & เปิดใช้",
            review: {
                enabled: (n: number) => `จะเปิด (${n})`,
                disabled: (n: number) => `จะปิด (${n})`,
                skipped: (n: number) => `ข้าม (${n})`,
                missing: (n: number) => `ไม่พบในเครื่อง (${n})`,
            },
        },
        detail: {
            edit: "แก้ไข",
            activate: "เปิดใช้",
            archive: "เก็บถาวร",
            unarchive: "นำกลับ",
            addItem: "เพิ่มจาก catalog",
            skills: "Skills",
            commands: "Commands",
            recentActivations: "ประวัติการเปิดใช้ล่าสุด",
            archivedBanner: "พรีเซ็ตนี้ถูกเก็บถาวร — อ่านอย่างเดียว ต้องนำกลับก่อนจึงจะแก้ไขหรือเปิดใช้ได้",
            missingBadge: "ไม่พบในเครื่อง",
            removeItem: "ลบออกจาก preset",
            openSkill: "เปิด skill",
            openCommand: "เปิด command",
        },
        activate: {
            title: (name: string) => `สลับไป "${name}"?`,
            cancel: "ยกเลิก",
            apply: "ใช้การเปลี่ยนแปลง",
            progressTitle: (name: string) => `กำลังเปิดใช้ "${name}"`,
            phaseScanning: "กำลังสแกน…",
            phaseEnabling: (n: number, t: number, what: string) => `กำลังเปิด ${what} (${n}/${t})…`,
            phaseDisabling: (n: number, t: number, what: string) => `กำลังปิด ${what} (${n}/${t})…`,
            phaseLogging: "กำลังบันทึก log…",
            toastSuccess: (e: number, d: number) => `สลับสำเร็จ (เปิด ${e}, ปิด ${d})`,
            toastPartial: (errors: number) => `เสร็จแล้ว แต่มี ${errors} errors — ดู log`,
            restartNote: "รีสตาร์ท Claude Code session ใหม่เพื่อให้การเปลี่ยนแปลงมีผล session เดิมจะคง skills ที่โหลดอยู่ไว้",
        },
        log: {
            title: "ประวัติการเปิดใช้",
            empty: "ยังไม่มีการเปิดใช้",
            status: { success: "สำเร็จ", partial: "บางส่วน", failed: "ล้มเหลว" },
            cols: { ts: "เมื่อไหร่", from: "จาก", to: "ไป", enabled: "เปิด", disabled: "ปิด", skipped: "ข้าม", errors: "Errors", status: "สถานะ" },
        },
        errors: {
            slugCollision: (slug: string) => `Slug "${slug}" ถูกใช้แล้ว (active หรือ archived)`,
            archivedActivate: "เปิดใช้พรีเซ็ตที่เก็บถาวรไม่ได้ ต้องนำกลับก่อน",
            archivedEdit: "แก้ไขพรีเซ็ตที่เก็บถาวรไม่ได้",
            generic: "เกิดข้อผิดพลาด",
        },
    },

    discoverPage: {
        title: "ค้นหาสกิลยอดนิยม",
        subtitle:
            "รีโพ Claude-Skills ยอดนิยมบน GitHub จัดอันดับตามจำนวนดาว รายการสร้างโดยสกิล discover-popular-skills ของ Claude Code และอ่านจากไฟล์ manifest ในเครื่อง — เว็บแอปไม่ได้เรียกออกเครือข่ายเลย",
        emptyTitle: "ยังไม่เคยรันการค้นพบ",
        empty1: "รันคำสั่งสแลช ",
        empty2: " ใน Claude Code (หรือเรียกสกิล ",
        empty3: ") เพื่อค้นหารีโพ Claude-Skills ที่ได้รับความนิยมที่สุดบน GitHub ผลลัพธ์อันดับ 10 อันดับแรกจะถูกบันทึกที่ ",
        empty4: " ที่รูตของรีโพ และปรากฏที่นี่",
        meta: {
            discoveredAt: "ค้นพบเมื่อ",
            auth: "การยืนยันตัวตน",
            queries: "คำค้นหา",
            entries: (count) => `${count} รีโพที่จัดอันดับ`,
            authGh: "GitHub CLI (gh)",
            authAnonymous: "fetch แบบไม่ยืนยันตัวตน",
        },
        rateLimited:
            "GitHub จำกัดอัตราการเรียกอย่างน้อยหนึ่งคำค้นในการรันครั้งนี้ — การจัดอันดับอาจไม่ครบ ลอง gh auth login แล้วรัน /skill-lector:discover-skills อีกครั้ง",
        readErrors: "ไม่สามารถ parse manifest ได้ครบถ้วน:",
        colRank: "#",
        colRepo: "รีโพซิทอรี",
        colStars: "ดาว",
        colTopics: "หัวข้อ",
        colStatus: "สถานะ",
        badgeVendored: "วางใน vendor แล้ว",
        badgeNotVendored: "ยังไม่ได้วางใน vendor",
        openRepo: "เปิดบน GitHub",
        vendoredHint: (p) => `Submodule ที่ ${p}`,
        actionsHeading: "ขั้นตอนถัดไป",
        actionsBody:
            "เลือกรีโพข้างบน แล้วเพิ่มเป็น git submodule จาก Claude Code จากนั้นติดตั้งสกิลของรีโพนั้นลงใน ~/.claude/skills/:",
        cmdClone: "/skill-lector:discover-skills clone <repo-name>",
        cmdInstall: "/skill-lector:vendor-install <skill-name>",
        refreshHeading: "รีเฟรชการจัดอันดับ",
        refreshBody:
            "จำนวนดาวเปลี่ยนได้ รัน discover ใหม่เมื่อใดก็ได้เพื่อเขียนทับ manifest ด้วย top 10 ใหม่:",
        cmdSearch: "/skill-lector:discover-skills",
    },

    cheatsPage: {
        title: "โพยพรอมต์",
        subtitle:
            "พรอมต์ที่นำกลับมาใช้ซ้ำได้ สกัดจากประวัติเซสชัน Claude ของคุณ — ค้นหา ปรับปรุง และคัดลอกไปใช้ใหม่",
        emptyTitle: "ยังไม่มีโพย",
        empty1: "รันคำสั่ง ",
        empty2:
            " ใน Claude Code เพื่อวิเคราะห์ประวัติเซสชันและสร้างคลังพรอมต์ที่นำกลับมาใช้ซ้ำได้ ผลลัพธ์จะถูกบันทึกลง ",
        empty3: " และแสดงที่นี่",
        search: "ค้นหาพรอมต์ ใจความ แท็ก…",
        colPrompt: "พรอมต์",
        colIntent: "ใจความ",
        colProject: "โปรเจ็กต์",
        colReuse: "ใช้ซ้ำ",
        colUsed: "ใช้",
        colUpdated: "เห็นล่าสุด",
        tabAll: "ทั้งหมด",
        tabFavorites: "รายการโปรด",
        sortRecent: "เห็นล่าสุด",
        sortReuse: "ใช้ซ้ำสูงสุด",
        sortUsed: "ใช้บ่อยสุด",
        favorite: "เพิ่มในรายการโปรด",
        unfavorite: "นำออกจากรายการโปรด",
        noMatch: "ไม่มีพรอมต์ที่ตรงกับตัวกรอง",
        showing: (start, end, total) => `แสดง ${start}–${end} จาก ${total} พรอมต์`,
        emptyCount: (total) => `0 จาก ${total} พรอมต์`,
        filterProject: "กรองตามโปรเจ็กต์",
        allProjects: "ทุกโปรเจ็กต์",
        filterIntent: "กรองตามใจความ",
        allIntents: "ทุกใจความ",
        originalLabel: "พรอมต์เดิม",
        improvedLabel: "ฉบับปรับปรุง",
        noImproved: "ยังไม่มีฉบับปรับปรุงสำหรับพรอมต์นี้",
        tagsLabel: "แท็ก",
        reuseLabel: "คะแนนใช้ซ้ำ",
        occurrencesLabel: "จำนวนครั้งที่ใช้",
        projectLabel: "โปรเจ็กต์",
        intentLabel: "ใจความ",
        seenRange: (first, last) => `เห็นครั้งแรก ${first} · ล่าสุด ${last}`,
        favoritedBadge: "รายการโปรด",
        viewTable: "มุมมองตาราง",
        viewCards: "มุมมองการ์ด",
        typedOnly: "เฉพาะที่พิมพ์เอง",
        typedOnlyHint: "แสดงเฉพาะพรอมต์ที่คุณพิมพ์เอง (ซ่อนพรอมต์เก่าที่พิสูจน์ไม่ได้)",
        provenanceLegacy: "เก่า",
        provenanceLegacyHint:
            "มาจากก่อนที่ Claude Code จะบันทึกต้นทางของพรอมต์ — พิสูจน์ไม่ได้ว่าคุณพิมพ์เอง",
        sourceLabel: "ต้นทาง",
        sourceTyped: "คุณพิมพ์เอง",
        sourceLegacy: "เก่า (พิสูจน์ต้นทางไม่ได้)",
        statTotal: "พรอมต์ทั้งหมด",
        statFavorites: "รายการโปรด",
        statProjects: "โปรเจ็กต์",
        statAvgReuse: "ใช้ซ้ำเฉลี่ย",
        showOriginal: "ต้นฉบับ",
        showImproved: "ปรับปรุง",
        displayModeLabel: "เวอร์ชันพรอมต์",
        switchToOriginal: "กำลังแสดงฉบับปรับปรุง — สลับไปต้นฉบับ",
        switchToImproved: "กำลังแสดงต้นฉบับ — สลับไปฉบับปรับปรุง",
        viewModeLabel: "โหมดมุมมอง",
        backToList: "กลับไปหน้าพรอมต์",
        itemPosition: (current, total) => `${current} จาก ${total}`,
    },

    flowsPage: {
        title: "โฟลว์",
        subtitle:
            "เชื่อมโพยพรอมต์ของคุณเป็นลำดับขั้นตอนสำหรับงานแต่ละแบบ เช่น ค้นคว้า → วางแผน → ลงมือทำ → ตรวจสอบ",
        emptyTitle: "ยังไม่มีโฟลว์",
        empty1: "สร้างโฟลว์ด้วย ",
        empty2: " หรือสร้างโฟลว์เริ่มต้นจากโพยที่จัดกลุ่มตามใจความด้วย ",
        empty3: "",
        newFlow: "สร้างโฟลว์",
        seed: "สร้างจากโพย",
        seeding: "กำลังสร้าง…",
        seededBadge: "สร้างอัตโนมัติ",
        loadingFlow: "กำลังโหลด…",
        emptySteps: "ยังไม่มีขั้นตอน — เพิ่มโพยด้านล่าง",
        addStep: "เพิ่มขั้นตอน",
        addFirstStep: "เพิ่มขั้นตอนแรก",
        copyPrompt: "คัดลอก prompt รวม",
        deleteFlow: "ลบ",
        start: "เริ่ม",
        end: "เสร็จ",
        steps: "ขั้นตอน",
        enhanced: "เพิ่มพลัง",
        original: "ต้นฉบับ",
        foldedIn: "รวมทักษะ",
        enhanceHintTitle: "ยังไม่เพิ่มพลัง",
        enhanceHintBody: "รวมแนวทางจากสกิลและคำสั่งที่ติดตั้งไว้ — รันคำสั่ง",
        enhanceHintCopy: "คัดลอกคำสั่ง",
        fillVariables: "เติมตัวแปร",
        fillHint: "เติมค่าตัวแปรเพื่อได้พรอมต์พร้อมใช้",
        view: "ดู",
        viewHint: "พรอมต์เต็มของขั้นตอนนี้",
        preview: "ตัวอย่าง",
        viewMarkdown: "Markdown",
        viewRaw: "ดิบ",
        unfilled: (n: number) => `ยังไม่เติม ${n}`,
        copyFilled: "คัดลอกที่เติมแล้ว",
        reset: "ล้าง",
        changeAdded: "เพิ่ม",
        changeRemoved: "ลบ",
        changeMoved: "ย้าย",
        revert: "ย้อนกลับ",
        applyChanges: "บันทึกการแก้ไข",
        revertChanges: "ยกเลิกการแก้ไข",
        applying: "กำลังบันทึก…",
        applyFailed: "บันทึกไม่สำเร็จ — การแก้ไขยังอยู่ ลองใหม่อีกครั้ง",
        unsavedChanges: (added: number, removed: number, moved: number) =>
            "ยังไม่บันทึก — " +
            [
                added ? `เพิ่ม ${added}` : "",
                removed ? `ลบ ${removed}` : "",
                moved ? `ย้าย ${moved}` : "",
            ]
                .filter(Boolean)
                .join(", "),
        pickerTitle: "เพิ่มขั้นตอน",
        search: "ค้นหาโฟลว์…",
        backToList: "โฟลว์ทั้งหมด",
        noMatch: "ไม่พบโฟลว์ที่ตรงกับการค้นหา",
        sortRecent: "อัปเดตล่าสุด",
        sortName: "ชื่อ (ก–ฮ)",
        sortSteps: "ขั้นตอนมากสุด",
        itemPosition: (current: number, total: number) => `${current} จาก ${total}`,
        switchFlow: "สลับโฟลว์",
        matchCount: (shown: number, total: number) =>
            shown === total ? `${total} โฟลว์` : `${shown} จาก ${total} โฟลว์`,
    },

    usecasePage: {
        title: "เริ่มต้นใช้งาน Skills Lector",
        subtitle:
            "Claude Code ติดตั้งอะไรไว้บ้าง — สกิล, คำสั่งสแลช, ฮุก, และโพยพรอมต์ที่ขุดจากเซสชันของคุณ — แต่ละอย่างอยู่ที่ไหน และจะอ่านกับจัดการมันด้วย Skills Lector อย่างไร",
        tocTitle: "ในหน้านี้",
        toc: {
            concepts: "แนวคิด",
            locations: "อยู่ที่ไหน",
            catalogTour: "อ่าน Skills Lector",
            examples: "ตัวอย่างใช้งาน",
            faq: "คำถามที่พบบ่อย",
        },
        concepts: {
            heading: "แนวคิด",
            body: `**Skills Lector** สแกนทุกสิ่งที่ Claude Code ติดตั้งไว้บนเครื่องของคุณและรวบรวมไว้ในที่เดียว: **สกิล**, **คำสั่งสแลช**, **ฮุก**, และ **โพย** พรอมต์ที่ขุดจากประวัติเซสชันของคุณ สองอย่างแรกคุณเขียนเอง อย่างที่สามรันอัตโนมัติ ส่วนอย่างสุดท้ายกู้คืนมาจากพรอมต์ที่คุณเคยพิมพ์ไปแล้ว

**Claude Skill** คือไดเรกทอรีที่มีไฟล์ \`SKILL.md\` ภายใน frontmatter จะประกาศ \`name\` และ \`description\` ของสกิล ส่วนเนื้อหาจะอธิบายว่า *เมื่อใด* ควรใช้และ *อย่างไร* Claude อ่าน description แล้วตัดสินใจเองว่าคำขอของผู้ใช้ตรงกับสกิลนี้หรือไม่ — นี่เรียกว่า **model invocation** สกิลยังสามารถระบุ \`disable-model-invocation: true\` เพื่อให้เรียกผ่านคำสั่งสแลชเท่านั้น

**คำสั่งสแลช** คือไฟล์ \`.md\` เดี่ยวภายใต้ไดเรกทอรี \`commands/\` คุณเรียกใช้อย่างชัดเจนด้วยการพิมพ์ \`/<ชื่อ>\` ใน Claude Code frontmatter สามารถระบุ \`description\`, \`argument-hint\`, และ \`allowed-tools\` ได้ ส่วนเนื้อหาจะกลายเป็น prompt ของเทิร์นนั้น — \`$ARGUMENTS\` จะถูกแทนที่ด้วยสิ่งที่ผู้ใช้พิมพ์หลังเครื่องหมายสแลช

**ฮุก** คือคำสั่งเชลล์ที่ Claude Code รันอัตโนมัติเมื่อเกิดเหตุการณ์ — ก่อนหรือหลังเครื่องมือทำงาน หรือตอนเริ่มและจบเซสชัน ฮุกอยู่ในคีย์ \`hooks\` ของ \`settings.json\` ไม่ใช่ไฟล์ของตัวเอง ส่วน **โพย** คือพรอมต์ที่นำกลับมาใช้ได้ซึ่ง Skills Lector ขุดจากเซสชันที่ผ่านมา ต่างจากอย่างอื่นตรงที่คุณไม่ได้ติดตั้งมัน — มันถูกกู้คืนจากประวัติและเก็บไว้ในที่เก็บในเครื่องที่คุณค้นหาและทำเครื่องหมายโปรดได้

**สิ่งที่ต้องจำให้แม่นคือใครเป็นผู้เรียกใช้อะไร** Claude เลือกสกิลและยิงฮุกเอง ส่วนคุณเลือกคำสั่งและโพยด้วยมือ model invocation คือสวิตช์สลับระหว่างอัตโนมัติกับด้วยมือของสกิล — และ **พรีเซ็ต** ให้คุณสลับสวิตช์นั้นกับสกิลและคำสั่งหลายตัวพร้อมกัน ซึ่งเป็นวิธีที่ Skills Lector จัดการว่า Claude เรียกอะไรเองได้บ้าง`,
        },
        locations: {
            heading: "อยู่ที่ไหน",
            body: `Skills Lector สแกนสี่ **ขอบเขต** สำหรับสกิลและคำสั่ง ขอบเขตคือสิ่งที่ป้าย **Type** บนทุกแถวบอกคุณ

| ขอบเขต | พาธสกิล | พาธคำสั่ง | หมายเหตุ |
|---|---|---|---|
| **personal** | \`~/.claude/skills/<ชื่อ>/SKILL.md\` | \`~/.claude/commands/<ชื่อ>.md\` | ใช้ได้ในทุกเซสชัน Claude Code |
| **plugin** | \`~/.claude/plugins/.../skills/...\` | \`~/.claude/plugins/.../commands/...\` | รวมมากับปลั๊กอินที่ติดตั้ง |
| **project** | \`<repo>/.claude/skills/<ชื่อ>/SKILL.md\` | \`<repo>/.claude/commands/<ชื่อ>.md\` | จำกัดในโปรเจ็กต์ มักคอมมิตเข้าโปรเจ็กต์ |
| **local** | \`sample-skills/\` ที่มากับแอปนี้ | — | ตัวอย่างที่มาด้วย ทำให้แดชบอร์ดไม่ว่าง |

**ฮุก** ไม่ใช่ไฟล์ของตัวเอง — มันอยู่ในคีย์ \`hooks\` ของ \`settings.json\` และ \`settings.local.json\` (ขอบเขต \`local\`) ทั้งระดับ personal, plugin, และ project ส่วน **โพย** ไม่มีพาธเลย: มันถูกขุดจากทรานสคริปต์เซสชัน Claude Code ของคุณ และเก็บไว้เป็นไฟล์ markdown ใต้ \`~/.skills-lector/store/cheats/\`

คุณสามารถชี้สแกนเนอร์ไปยังไดเรกทอรีเพิ่มเติมได้ด้วย \`skills-lector.config.json\` ที่วางคู่กับตำแหน่งที่รัน dev server หรือใช้ตัวแปรสภาพแวดล้อม \`SKILLS_SCAN_ROOTS\` ดูตำแหน่งทั้งหมดที่กำลังสแกนอยู่ได้ที่หน้า **Sources**`,
        },
        catalogTour: {
            heading: "อ่าน Skills Lector",
            body: `Skills Lector มีมุมมองเหล่านี้ สร้างจากการสแกนชุดเดียวกันทั้งหมด ทุกอย่างอ่านจากดิสก์ของคุณ — มีเพียง **Presets** เท่านั้นที่เขียนกลับไปยังไฟล์สกิลและคำสั่งของคุณ (การทำเครื่องหมายโปรดให้โพยจะเขียนกลับลงในไฟล์ \`.md\` ของโพยนั้นเองที่ \`~/.skills-lector/store/cheats/\`)

- **Skills** (\`/\`) — ทุก \`SKILL.md\` ที่พบ พร้อมการค้นหา ตัวกรอง และหน้ารายละเอียดที่เรนเดอร์เนื้อหา markdown และบอกแหล่งที่มาของไฟล์
- **Commands** (\`/commands\`) — ทุกคำสั่งสแลชที่พบ พร้อมความสามารถค้นหา/กรอง/จัดเรียงแบบเดียวกัน หน้ารายละเอียดแสดงรูปแบบการเรียก frontmatter และเนื้อหาทั้งหมด
- **Hooks** (\`/hooks\`) — ทุกฮุกจากไฟล์ \`settings.json\` ของคุณ แผ่เป็นหนึ่งแถวต่อ event → matcher → command เพื่อให้เห็นว่าอะไรรันอัตโนมัติและเมื่อใด
- **Cheats** (\`/cheats\`) — พรอมต์ที่นำกลับมาใช้ได้ซึ่งขุดจากประวัติเซสชันของคุณ แต่ละรายการมีทั้งต้นฉบับและฉบับปรับปรุง ค้นหาและทำเครื่องหมายโปรดได้
- **Presets** (\`/presets\`) — มุมมองจัดการเพียงหนึ่งเดียว พรีเซ็ตคือชุดสกิลและคำสั่งที่ตั้งชื่อไว้ การเปิดใช้งานจะสลับแฟล็ก model-invocation ของแต่ละรายการเป็นกลุ่ม เพื่อให้ Claude เรียกเองเฉพาะสิ่งที่คุณเลือก รายการที่ปักหมุดจะเปิดอยู่เสมอ และการเปิดใช้ทุกครั้งถูกบันทึกใน log
- **Discover** (\`/discover\`) — รีโพ Claude-Skills ยอดนิยมที่สุดบน GitHub จัดอันดับโดยสกิล \`discover-popular-skills\` และอ่านที่นี่จาก manifest ในเครื่อง
- **Analytics** (\`/analytic\`) — สกิลและคำสั่งที่คุณใช้จริง สร้างขึ้นใหม่จากทรานสคริปต์เซสชัน Claude Code ของคุณ มีประโยชน์ในการหาสิ่งที่คุณลืมว่าติดตั้งไว้
- **Graph** (\`/graph\`) — สกิลและคำสั่งในพรีเซ็ตที่เปิดใช้งานของคุณเชื่อมโยงกันอย่างไร จัดกลุ่มรอบปลั๊กอินหรือโปรเจ็กต์ที่บรรจุพวกมัน
- **Sources** (\`/sources\`) — ต้นทางของแต่ละสกิล: มาจากรีโพ GitHub ปลั๊กอิน หรือไดเรกทอรีในเครื่อง พร้อมตารางของรูตที่สแกนทุกตำแหน่งบนเครื่องนี้

ปุ่ม **Rescan** ที่มุมขวาบนรันการสแกนดิสก์ใหม่ทั้งหมด — สกิล, คำสั่ง, ฮุก, analytics, และ manifest ของ discover — และรีเฟรชทุกมุมมอง`,
        },
        examples: {
            heading: "ตัวอย่างใช้งาน",
            intro:
                "สี่งานที่ทำได้ทันทีวันนี้ ตั้งแต่ไม่ต้องเขียนโค้ดเลย (ติดตั้ง) ไปจนถึงเขียนสกิลหรือคำสั่งขั้นต่ำเอง",
            installVendor: {
                heading: "1. ติดตั้งสกิลจาก vendor",
                body: `รีโพนี้เก็บสกิลจากภายนอกเป็น **git submodule ภายใต้ \`vendor/\`** คำสั่งสแลช \`/skill-lector:vendor-install\` (อยู่ใน \`.claude/commands/\` ของรีโพนี้) ใช้ติดตั้งสกิลใดสกิลหนึ่งเข้าไปยังไดเรกทอรีสกิลส่วนตัวของคุณ ซึ่ง Claude Code จะตรวจพบ

รันโดยไม่ใส่อาร์กิวเมนต์เพื่อดูรายการที่มี:`,
                listInvocation: "/skill-lector:vendor-install",
                installInvocation: "/skill-lector:vendor-install debug-mantra",
                after: `เลือกชื่อสกิลจากรายการแล้วส่งเป็นอาร์กิวเมนต์ ค่าเริ่มต้นจะคัดลอกสกิลเข้า \`~/.claude/skills/\` (ขอบเขต personal ใช้ได้ทุกที่) ส่งคำว่า \`project\` เป็นอาร์กิวเมนต์ที่สองเพื่อติดตั้งเข้า \`.claude/skills/\` ของรีโพปัจจุบันแทน

เมื่อติดตั้งเสร็จ กด **Rescan** ที่หัว Skills Lector — สกิลใหม่จะปรากฏในมุมมอง Skills`,
            },
            authorSkill: {
                heading: "2. เขียนสกิลของคุณเอง",
                body: `สกิลขั้นต่ำคือไดเรกทอรีที่มีไฟล์เดียว สร้าง \`~/.claude/skills/<ชื่อ>/SKILL.md\` แล้ววาง:`,
                sampleLabel: "SKILL.md",
                sample: `---
name: greet-user
description: Greet the user warmly by name when they say hello, hi, or otherwise open a conversation. Use this at the start of a new session or when the user explicitly asks to be greeted.
---

# Greet User

When the user opens a conversation with a greeting (hello, hi, hey, สวัสดี, …), respond with a warm one-line greeting that uses their name if you know it, and then ask what they would like to work on.

Do **not** trigger this skill mid-conversation — only on the opening turn or when the user explicitly asks for a greeting.`,
                after: `ฟิลด์ \`description\` คือสิ่งที่ Claude อ่านเพื่อตัดสินใจ *เมื่อใด* จะเรียกใช้สกิล — ระบุวลีทริกเกอร์ให้เฉพาะเจาะจง ส่วนเนื้อหาคือสิ่งที่ Claude ทำตามเมื่อเลือกใช้แล้ว กด **Rescan** แล้วสกิลใหม่จะปรากฏใต้ขอบเขต **Personal**`,
            },
            authorCommand: {
                heading: "3. เขียนคำสั่งสแลช",
                body: `คำสั่งสแลชคือไฟล์เดี่ยว สร้าง \`~/.claude/commands/<ชื่อ>.md\` สำหรับคำสั่งส่วนตัว หรือ \`<repo>/.claude/commands/<ชื่อ>.md\` สำหรับคำสั่งระดับโปรเจ็กต์:`,
                sampleLabel: "explain.md",
                sample: `---
description: Explain a function, file, or concept in this codebase in plain language.
argument-hint: "[function-name|file-path|concept]"
allowed-tools: Read, Grep, Glob
---

Explain **$ARGUMENTS** in plain language. Cover:

1. What it does, in one sentence.
2. Where it is used in this codebase (use Grep / Glob).
3. Any non-obvious behaviour or edge cases worth knowing.

Keep the explanation tight — three short paragraphs at most.`,
                after: `ชื่อไฟล์จะกลายเป็นชื่อคำสั่ง: \`explain.md\` → \`/explain\` ไดเรกทอรีย่อยจะกลายเป็นเนมสเปซด้วย \`:\` เช่น \`docs/api.md\` คือ \`/docs:api\` \`$ARGUMENTS\` จะถูกแทนที่ด้วยสิ่งที่ตามหลังการเรียกสแลช ใช้ \`allowed-tools\` เพื่อประกาศว่าคำสั่งได้รับอนุญาตให้เรียกเครื่องมือของ Claude Code ตัวใดบ้าง`,
            },
            discover: {
                heading: "4. หาสกิลยอดนิยมเพื่อติดตั้ง",
                body: `ยังไม่แน่ใจว่าควรติดตั้งสกิลใดดี? มุมมอง **Discover** (\`/discover\`) จัดอันดับรีโพ Claude-Skills ที่ได้รับความนิยมที่สุดบน GitHub อันดับนี้ผลิตโดยคำสั่ง \`/skill-lector:discover-skills\` ของ Claude Code (สกิล \`discover-popular-skills\`) ส่วนตัวหน้าเองอ่านเพียง manifest ในเครื่องที่สกิลเขียนไว้ ดังนั้น Skills Lector จึงยังไม่เรียกเครือข่ายด้วยตัวเอง

รัน \`/skill-lector:discover-skills\` ใน Claude Code เพื่อรีเฟรชรายการ และเมื่อยืนยันจะเพิ่มรีโพเข้าโปรเจ็กต์นี้เป็น git submodule ใต้ \`vendor/\` จากนั้นติดตั้งสกิลใดก็ได้ด้วยขั้นตอน **ติดตั้งสกิลจาก vendor** ข้างบน`,
            },
        },
        faq: {
            heading: "คำถามที่พบบ่อย",
            items: [
                {
                    q: "เพิ่มสกิลแล้ว Skills Lector ไม่แสดง เพราะอะไร",
                    a: "การสแกนถูกแคชไว้ 8 วินาที และหน้าเว็บเรนเดอร์ครั้งเดียวต่อคำขอ กด **Rescan** ที่มุมขวาบน มันจะรันการสแกนดิสก์ใหม่ทั้งหมด — สกิล, คำสั่ง, ฮุก, analytics, และ manifest ของ discover — แล้วรีเฟรชมุมมองต่าง ๆ ถ้ายังไม่ปรากฏ ตรวจสอบว่าไฟล์อยู่ในขอบเขตใดขอบเขตหนึ่งที่อธิบายไว้ในหัวข้อ **อยู่ที่ไหน** และชื่อไดเรกทอรีตรงกับชื่อสกิลใน frontmatter",
                },
                {
                    q: "สกิลกับคำสั่งสแลชต่างกันอย่างไร",
                    a: "**ใครเป็นผู้เรียก** คำสั่งสแลชเรียกโดย *คุณ* พิมพ์ \`/<ชื่อ>\` ส่วนสกิลเรียกโดย *Claude* เมื่อคำขอของผู้ใช้ตรงกับ \`description\` ของสกิล ทั้งคู่สามารถมาพร้อมเครื่องมือและ prompt ความแตกต่างคือทริกเกอร์",
                },
                {
                    q: "Skills Lector ส่งข้อมูลออกเครือข่ายไหม",
                    a: "ไม่ส่ง Skills Lector อ่านไฟล์จากดิสก์ของคุณและเรนเดอร์ในเบราว์เซอร์ ไม่มีการเรียก HTTP ออกข้างนอก — มุมมอง **Sources** และ **Discover** เชื่อมโยงไป GitHub แต่ผ่านแท็ก anchor ธรรมดาที่คุณคลิกเอง และ Discover อ่านเพียง manifest ในเครื่อง การเรียก GitHub เพียงอย่างเดียวอยู่ในสกิล \`discover-popular-skills\` ของ Claude Code ไม่ใช่ในตัว Skills Lector เอง",
                },
                {
                    q: "ถ้า SKILL.md มี frontmatter ผิดรูปแบบจะเป็นอย่างไร",
                    a: "สแกนเนอร์ออกแบบมาให้ผ่อนปรนโดยตั้งใจ มันพยายามกู้ \`name\` และ \`description\` แม้จาก YAML ที่ผิดรูปแบบ และพาธใดที่อ่านไม่ได้เลยจะถูกรายงานในกล่อง **errors** ที่ด้านล่างของหน้า ไม่ใช่ทำให้การสแกนล้ม",
                },
                {
                    q: "จะหยุดไม่ให้ Claude เรียกสกิลเองอย่างไร",
                    a: "เพิ่ม \`disable-model-invocation: true\` ใน frontmatter ของสกิล หรือใช้คำสั่ง \`/set-model-invocation\` หากติดตั้งไว้ หากต้องการสลับสกิลและคำสั่งหลายตัวพร้อมกัน ให้สร้าง **พรีเซ็ต** แล้วเปิดใช้งาน — นั่นจะเขียนแฟล็กเดียวกันเป็นกลุ่ม",
                },
                {
                    q: "โพย (cheats) คืออะไร และมาจากไหน",
                    a: "โพยคือพรอมต์ที่นำกลับมาใช้ได้ซึ่งขุดจากประวัติเซสชัน Claude Code ของคุณเองโดยคำสั่ง \`/skill-lector:cheats\` แต่ละรายการเก็บทั้งพรอมต์ต้นฉบับและฉบับปรับปรุง คุณค้นหาและทำเครื่องหมายโปรดได้ในมุมมอง **Cheats** ข้อมูลเก็บเป็นไฟล์ markdown ใต้ \`~/.skills-lector/store/cheats/\` — ไม่มีการอัปโหลดอะไร",
                },
                {
                    q: "พรีเซ็ต (preset) คืออะไร และใช้อย่างไร",
                    a: "พรีเซ็ตคือชุดสกิลและคำสั่งที่ตั้งชื่อไว้ การเปิดใช้งานในมุมมอง **Presets** จะเขียนแฟล็ก \`disable-model-invocation\` ของแต่ละรายการในขอบเขต personal เป็นกลุ่ม เพื่อให้ Claude เรียกเองเฉพาะรายการที่คุณเลือก ที่เหลือกลายเป็นเรียกผ่านสแลชเท่านั้น รายการที่ปักหมุดจะเปิดอยู่เสมอ และการเปิดใช้ทุกครั้งถูกบันทึกใน log นี่เป็นส่วนเดียวของ Skills Lector ที่เขียนไฟล์สกิลและคำสั่งของคุณ",
                },
                {
                    q: "ใต้ Hooks แสดงอะไรบ้าง",
                    a: "ทุกฮุกจากคีย์ \`hooks\` ของไฟล์ \`settings.json\` และ \`settings.local.json\` ของคุณ ทั้งขอบเขต personal, plugin, และ project แต่ละคู่ event → matcher → command ถูกแผ่เป็นหนึ่งแถว เพื่อให้เห็นชัดว่าคำสั่งเชลล์ใดที่ Claude Code รันอัตโนมัติและเมื่อเกิดเหตุการณ์ใด",
                },
            ],
        },
    },

    explorer: {
        searchSkills: "ค้นหาสกิล, ปลั๊กอิน, แหล่งที่มา…",
        searchCommands: "ค้นหาคำสั่ง, ปลั๊กอิน, แหล่งที่มา…",
        searchHooks: "ค้นหา event, matcher, คำสั่ง…",
        tabAll: "ทั้งหมด",
        sortBy: "เรียงตาม",
        sortRecent: "อัปเดตล่าสุด",
        sortName: "ชื่อ (ก–ฮ)",
        sortEvent: "Event (A–Z)",
        sortUsage: "ใช้บ่อยที่สุด",
        colSkill: "สกิล",
        colCommand: "คำสั่ง",
        colHookCommand: "คำสั่ง",
        colEvent: "Event",
        colMatcher: "Matcher",
        colType: "ประเภท",
        colScope: "ขอบเขต",
        colSource: "แหล่งที่มา",
        colSourceFile: "ไฟล์แหล่งที่มา",
        colUpdated: "อัปเดตล่าสุด",
        colUsed: "ใช้แล้ว",
        colInvocation: "การเรียกใช้",
        noSkillsMatch: "ไม่มีสกิลที่ตรงกับตัวกรอง",
        noCommandsMatch: "ไม่มีคำสั่งที่ตรงกับตัวกรอง",
        noHooksMatch: "ไม่มี hook ที่ตรงกับตัวกรอง",
        showingSkills: (start, end, total) =>
            `แสดง ${start}–${end} จาก ${total} สกิล`,
        showingCommands: (start, end, total) =>
            `แสดง ${start}–${end} จาก ${total} คำสั่ง`,
        showingHooks: (start, end, total) =>
            `แสดง ${start}–${end} จาก ${total} hook`,
        emptySkills: (total) => `0 จาก ${total} สกิล`,
        emptyCommands: (total) => `0 จาก ${total} คำสั่ง`,
        emptyHooks: (total) => `0 จาก ${total} hook`,
        pluginTitle: (name) => `ปลั๊กอิน: ${name}`,
        filterInvocation: "กรองตามการเรียกใช้",
        invocationAll: "การเรียกใช้ทั้งหมด",
        invocationModel: "โมเดลเรียกได้",
        invocationSlashOnly: "สแลชเท่านั้น",
        invocationModelHint:
            "โมเดลเรียกได้ — Claude เรียกใช้เองได้อัตโนมัติ ไม่ต้องพิมพ์คำสั่งสแลช",
        invocationSlashOnlyHint: "สแลชเท่านั้น — Claude จะไม่เรียกใช้เอง",
        filterEvent: "กรองตาม event",
        allEvents: "ทุก event",
        filterPreset: "กรองตาม preset",
        presetAll: "ทุก preset",
    },

    sidebar: {
        allSkills: "สกิลทั้งหมด",
        allCommands: "คำสั่งทั้งหมด",
        filterSkills: "กรองสกิล…",
        filterCommands: "กรองคำสั่ง…",
        filterSkillsAria: "กรองสกิล",
        filterCommandsAria: "กรองคำสั่ง",
        noSkillsMatch: "ไม่มีสกิลที่ตรงกับตัวกรอง",
        noCommandsMatch: "ไม่มีคำสั่งที่ตรงกับตัวกรอง",
    },

    stats: {
        totalSkills: "สกิลทั้งหมด",
        fromPlugins: "จากปลั๊กอิน",
        totalCommands: "คำสั่งทั้งหมด",
        totalHooks: "Hook ทั้งหมด",
        preToolUseCount: "PreToolUse",
        postToolUseCount: "PostToolUse",
        sessionEventsCount: "Event เซสชัน",
        preToolUseSub: "ก่อนเครื่องมือทำงาน",
        postToolUseSub: "หลังเครื่องมือทำงาน",
        sessionEventsSub: "start, stop, prompt, …",
        modelInvocableSub: "Claude เรียกใช้เองได้",
        slashOnlySub: "เรียกผ่านสแลชเท่านั้น",
        acrossLocations: (count) => `จาก ${count} ตำแหน่งที่สแกน`,
        acrossSettingsFiles: (count) => `จาก ${count} ไฟล์ settings`,
        pluginsInstalled: (count) => `ติดตั้งปลั๊กอิน ${count} รายการ`,
        pluginsShort: (count) => `${count} ปลั๊กอิน`,
    },

    analyticsPage: {
        title: "วิเคราะห์การใช้งาน",
        subtitle:
            "สกิลและคำสั่งใดที่คุณใช้งานจริง — และอันใดที่คุณลืมไปแล้ว สร้างขึ้นใหม่จากทรานสคริปต์เซสชัน Claude Code ของคุณ",
        empty:
            "ยังไม่พบการเรียกใช้สกิลหรือคำสั่งในทรานสคริปต์เซสชันใด ๆ ลองใช้สกิลและคำสั่งสแลชใน Claude Code สักสองสามครั้ง แล้วกดสแกนใหม่",
    },

    analytics: {
        windows: {
            "4h": { label: "4 ชั่วโมง", long: "4 ชั่วโมงที่ผ่านมา" },
            "1d": { label: "24 ชั่วโมง", long: "24 ชั่วโมงที่ผ่านมา" },
            "1w": { label: "7 วัน", long: "7 วันที่ผ่านมา" },
            all: { label: "ทั้งหมด", long: "ประวัติทั้งหมดที่บันทึกไว้" },
        },
        trackedInvocations: "การเรียกใช้ที่บันทึกไว้",
        neverUsed: "ไม่เคยใช้",
        idle: "ไม่ได้ใช้ 7+ วัน",
        catalogCoverage: "ความครอบคลุมแคตตาล็อก",
        noActivityYet: "ยังไม่มีกิจกรรมที่บันทึกไว้",
        acrossTranscripts: (count) => `จาก ${count} ทรานสคริปต์`,
        skillsCommandsBreakdown: (skills, commands) =>
            `${skills} สกิล · ${commands} คำสั่ง`,
        coverageSub: (used, total) => `เรียกใช้แล้ว ${used}/${total}`,
        mostUsed: "ใช้บ่อยที่สุด",
        invocationsIn: (count, windowLong) =>
            `${count} การเรียกใช้ใน ${windowLong}`,
        topSkills: "สกิลยอดนิยม",
        topCommands: "คำสั่งยอดนิยม",
        noSkillsIn: (windowLong) => `ไม่มีสกิลที่ใช้ใน ${windowLong}`,
        noCommandsIn: (windowLong) => `ไม่มีคำสั่งที่ใช้ใน ${windowLong}`,
        activityHeatmap: "ฮีตแมปกิจกรรม",
        lastDays: (count) => `${count} วันล่าสุด`,
        skills: "สกิล",
        commands: "คำสั่ง",
        noSkillActivity: (count) => `ไม่มีกิจกรรมสกิลใน ${count} วันล่าสุด`,
        noCommandActivity: (count) => `ไม่มีกิจกรรมคำสั่งใน ${count} วันล่าสุด`,
        noActivity: (count) => `ไม่มีกิจกรรมใน ${count} วันล่าสุด`,
        reminders: "การแจ้งเตือน",
        remindersSub: "สกิลและคำสั่งที่ควรกลับไปดูอีกครั้ง",
        neverUsedEmpty: "สกิลและคำสั่งที่ติดตั้งทุกตัวถูกใช้อย่างน้อยหนึ่งครั้งแล้ว",
        idleEmpty: "ไม่มีอะไรที่ห่างหาย — ทุกอย่างถูกใช้เมื่อเร็ว ๆ นี้",
        lastUsedTooltip: (label) => `ใช้ล่าสุด ${label}`,
        fromSourceTooltip: (source) => `จาก ${source}`,
        filterByOrigin: "กรองตามแหล่งที่มา",
        originAll: "ทุกแหล่งที่มา",
        originMain: "เซสชันหลัก",
        originSubagent: "ซับเอเจนต์",
        originWorkflow: "เวิร์กโฟลว์",
        originBadgeTooltip: (workflow, subagent) =>
            `${workflow} จากเวิร์กโฟลว์ · ${subagent} จากซับเอเจนต์`,
        heatLess: "น้อย",
        heatMore: "มาก",
        heatCell: (name, day, count) => `${name} — ${day}: ${count} ครั้ง`,
    },

    graphPage: {
        title: "กราฟความสัมพันธ์",
        subtitle:
            "สกิลและคำสั่งในพรีเซ็ตที่ใช้งานเชื่อมโยงกันอย่างไร — จัดกลุ่มรอบปลั๊กอินหรือโปรเจ็กต์ที่รวมไว้ และเชื่อมโยงทุกที่ที่อันหนึ่งอ้างถึงอีกอันหนึ่ง วางเมาส์บนโหนดเพื่อดูการเชื่อมต่อ คลิกเพื่อเปิด",
        activePresetLabel: "พรีเซ็ตที่ใช้งาน:",
        noActivePresetTitle: "ยังไม่ได้เปิดใช้พรีเซ็ต",
        noActivePresetDesc:
            "กราฟจะวาดเฉพาะสกิลและคำสั่งในพรีเซ็ตที่เปิดใช้งานเท่านั้น เพราะกราฟจากทั้งแคตตาล็อกหนักเกินไป เปิดใช้พรีเซ็ตเพื่อดูความสัมพันธ์",
        noActivePresetCta: "จัดการพรีเซ็ต",
        emptyTitle: "ยังไม่มีอะไรให้วาดกราฟ",
        empty1:
            "พรีเซ็ตที่เปิดใช้งานยังไม่มีรายการที่ติดตั้งในขอบเขตส่วนตัว จึงไม่มีความสัมพันธ์ให้วาด เพิ่มรายการในพรีเซ็ตแล้วกด ",
        empty2: "",
        statsLine: (skills, commands, clusters, references) =>
            `${skills} สกิล · ${commands} คำสั่ง · ${clusters} คลัสเตอร์ · ${references} การอ้างอิง`,
    },

    graph: {
        all: "ทั้งหมด",
        skills: "สกิล",
        commands: "คำสั่ง",
        legend: "คำอธิบาย",
        bundledTogether: "รวมอยู่ด้วยกัน",
        references: "การอ้างอิง",
        controlsHint: "ลากเพื่อหมุน · เลื่อนเพื่อซูม · คลิกโหนดเพื่อเปิด",
        enterFullscreen: "ดูแบบเต็มหน้าจอ",
        exitFullscreen: "ออกจากเต็มหน้าจอ",
    },

    sources: {
        title: "แหล่งที่มา",
        subtitle:
            "สกิลที่ติดตั้งของคุณมาจากไหน — รีโพซิทอรี GitHub, ปลั๊กอิน, และไดเรกทอรีในเครื่อง",
        kinds: {
            github: "GitHub",
            git: "Git รีโมต",
            local: "ไดเรกทอรีในเครื่อง",
            plugin: "ปลั๊กอิน",
        },
        openRepository: "เปิดรีโพซิทอรี",
        skillCount: (count) => `${count} สกิล`,
        noSources: "ไม่พบแหล่งที่มา",
        scanLocations: "ตำแหน่งที่สแกน",
        scanLocationsDesc1:
            "ไดเรกทอรีที่แคตตาล็อกเดินสำรวจเพื่อค้นหาไฟล์ SKILL.md กำหนดรูตเพิ่มเติมได้ใน ",
        scanLocationsDesc2: "",
        colLocation: "ตำแหน่ง",
        colPath: "พาธ",
        colType: "ประเภท",
        colSkills: "สกิล",
        rootLabel: (key, arg) => {
            switch (key) {
                case "personalSkills":
                    return "สกิลส่วนตัว";
                case "installedPlugins":
                    return "ปลั๊กอินที่ติดตั้ง";
                case "coworkSkills":
                    return "สกิล Agent / Cowork";
                case "sampleSkills":
                    return "สกิลตัวอย่างที่มากับแอป";
                case "customRoot":
                    return "รูตที่กำหนดเอง";
                case "personalCommands":
                    return "คำสั่งส่วนตัว";
                case "personalSettings":
                    return "Settings ส่วนตัว";
                case "projectSettings":
                    return `Settings ของโปรเจ็กต์: ${arg ?? ""}`;
                case "projectLocalSettings":
                    return `Settings เฉพาะเครื่องของโปรเจ็กต์: ${arg ?? ""}`;
                case "project":
                    return `โปรเจ็กต์: ${arg ?? ""}`;
                case "plugin":
                    return `ปลั๊กอิน: ${arg ?? ""}`;
            }
        },
        rootKinds: {
            personal: "ส่วนตัว",
            plugin: "ปลั๊กอิน",
            project: "โปรเจ็กต์",
            local: "ในเครื่อง",
            auto: "อัตโนมัติ",
        },
    },

    detail: {
        lastModified: "แก้ไขล่าสุด",
        source: "แหล่งที่มา",
        branch: "แบรนช์",
        lastCommit: "คอมมิตล่าสุด",
        files: "ไฟล์",
        size: "ขนาด",
        used: "การใช้งาน",
        lastUsed: "ใช้ล่าสุด",
        allowedTools: "เครื่องมือที่อนุญาต",
        name: "ชื่อ",
        version: "เวอร์ชัน",
        author: "ผู้เขียน",
        namespace: "เนมสเปซ",
        argumentHint: "คำใบ้อาร์กิวเมนต์",
        model: "โมเดล",
        modelInvocation: "การเรียกใช้โดยโมเดล",
        modelInvocationHint:
            "รันคำสั่ง /skill-lector:model-invocation ใน Claude Code เพื่อเปลี่ยนค่านี้:",
        modelInvocationEnable: "เปิด — ให้ Claude เรียกใช้เองอัตโนมัติ",
        modelInvocationDisable: "ปิด — ให้เรียกผ่านสแลชเท่านั้น",
        pipeline: "ไปป์ไลน์",
        workflowSteps: "ขั้นตอนเวิร์กโฟลว์",
        sectionOutline: "โครงร่างหัวข้อ",
        details: "รายละเอียด",
        plugin: "ปลั๊กอิน",
        project: "โปรเจ็กต์",
        locationOnDisk: "ตำแหน่งบนดิสก์",
        skillNoBody: "ไฟล์ SKILL.md นี้ไม่มีเนื้อหา",
        skillUnreadable: "ไม่สามารถอ่านไฟล์ SKILL.md นี้ได้",
        commandNoBody: "ไฟล์คำสั่งนี้ไม่มีเนื้อหา",
        commandUnreadable: "ไม่สามารถอ่านไฟล์คำสั่งนี้ได้",
        usedTimes: (count) => `${count}×`,
        event: "Event",
        matcher: "Matcher",
        matcherAny: "ใด ๆ",
        command: "คำสั่ง",
        commandType: "ประเภท",
        timeout: "Timeout",
        timeoutSeconds: (s) => `${s} วินาที`,
        sourceFile: "ไฟล์ Settings",
        sourceFileSize: "ขนาดไฟล์",
        backToPreset: (name) => `กลับไปยัง preset "${name}" ใน explorer`,
    },

    viewer: {
        preview: "ตัวอย่าง",
        raw: "ต้นฉบับ",
        copy: "คัดลอก",
        copied: "คัดลอกแล้ว",
        copyRaw: (file) => `คัดลอก ${file} ต้นฉบับไปยังคลิปบอร์ด`,
    },

    pluginScopeNotice: {
        headerWithCount: (count) =>
            `รายการประเภท plugin ${count} รายการถูกซ่อน — เพิ่มเข้า preset ไม่ได้`,
        headerGeneric: "รายการประเภท plugin เพิ่มเข้า preset ไม่ได้",
        body: "Preset เขียนข้อมูลที่ ~/.claude/skills/ เท่านั้น ถ้าแก้ frontmatter ของ plugin อัปเดต plugin ครั้งถัดไปจะเขียนทับ",
        showSteps: "ดูวิธีติดตั้ง",
        stepsIntro: "ติดตั้ง skill เข้า personal scope เพื่อให้เลือกใน preset ได้:",
        stepVendoredLabel: "Skill ใน vendor/ ของรีโพนี้:",
        stepPluginLabel: "Skill จาก plugin marketplace:",
        stepPluginBody:
            "คัดลอก skills/<name>/ (หรือ commands/<name>.md) จาก ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/ ไปวางที่พาธเดียวกันใต้ ~/.claude/ แล้วกด Rescan",
        dismiss: "ปิด",
        emptyPickerWithHidden: (count) =>
            `ยังไม่มีรายการ personal scope — มี ${count} รายการ plugin ถูกซ่อนอยู่ด้านบน`,
    },
};
