// Centralized bilingual presentation-layer localization.
// Original English text is retained by the React components; this layer localizes visible text.
export type Language = 'fa' | 'en'
const dictionary: Record<string,string> = {
  "Dashboard": "داشبورد",
  "Exploration Evaluator": "ارزیابی اکتشاف",
  "Reserve Simulator": "شبیه‌ساز ذخایر",
  "Mining Economics Engine": "موتور اقتصاد معدن",
  "Risk & Scenario Analyzer": "تحلیل ریسک و سناریو",
  "Financial Valuator": "ارزش‌گذاری مالی",
  "ESG & Governance Tracker": "پایش محیط زیست و حاکمیت",
  "Continuous ESG & Governance Tracker": "پایش مستمر محیط زیست و حاکمیت",
  "Stage-Gate Decision Center": "مرکز تصمیم‌گیری مرحله‌ای",
  "The 6-Module Stage-Gate Decision Architecture": "معماری تصمیم‌گیری شش‌ماژولی",
  "EXPLORATION TO INVESTMENT · DECISION INTELLIGENCE": "از اکتشاف تا سرمایه‌گذاری · تحلیل تصمیم",
  "Transforming raw geological inputs into boardroom computational outputs.": "تبدیل داده‌های زمین‌شناسی به نتایج قابل استفاده برای مدیران.",
  "From raw geological evidence to boardroom-ready financial scenarios.": "از شواهد زمین‌شناسی تا سناریوهای مالی برای تصمیم مدیران.",
  "Raw Geological Inputs": "داده‌های خام زمین‌شناسی",
  "Financial Value": "ارزش مالی",
  "Screening & Targets": "غربالگری و اهداف",
  "Advanced Drilling": "حفاری پیشرفته",
  "Pre-Feasibility": "پیش‌امکان‌سنجی",
  "Risk Assessment": "ارزیابی ریسک",
  "Bankable Feasibility": "امکان‌سنجی بانکی",
  "Across All Gates": "در تمام مراحل",
  "Continuous": "مستمر",
  "Decision modules": "ماژول‌های تصمیم‌گیری",
  "Stage gates": "مراحل تصمیم‌گیری",
  "Portfolio targets": "اهداف اکتشافی",
  "Governance scope": "دامنه نظارت",
  "Connected workspaces": "صفحات مرتبط",
  "Screening to feasibility": "از ارزیابی اولیه تا امکان‌سنجی",
  "Simulated records": "اطلاعات نمایشی",
  "Continuous oversight": "نظارت مستمر",
  "All gates": "تمام مراحل",
  "Module quick access": "دسترسی سریع به ماژول‌ها",
  "Select a module to open its decision workspace. ESG and governance span all four gates.": "برای ورود به هر ماژول روی آن کلیک کنید. نظارت محیط زیست در تمام مراحل انجام می‌شود.",
  "Detailed simulated indicators and links to existing geoscience workspaces.": "شاخص‌های نمایشی و دسترسی به صفحات تخصصی زمین‌شناسی.",
  "Open decision workspace": "ورود به ماژول",
  "Demo target": "هدف نمایشی",
  "Target": "هدف",
  "Scenario": "سناریو",
  "Conservative": "بدبینانه",
  "Base": "پایه",
  "Optimistic": "خوش‌بینانه",
  "Shared inputs across all six modules · demonstration only": "ورودی‌های مشترک بین شش ماژول · صرفاً نمایشی",
  "Screen prospects and prioritize geological targets": "بررسی محدوده‌ها و اولویت‌بندی اهداف زمین‌شناسی",
  "Explore resource potential and drilling uncertainty": "بررسی ذخیره احتمالی و عدم قطعیت حفاری",
  "Test operating assumptions and preliminary viability": "بررسی هزینه‌های عملیات و توجیه اولیه اقتصادی",
  "Stress-test outcomes against key uncertainties": "بررسی نتیجه پروژه در شرایط نامطمئن",
  "Compare discounted project cash-flow scenarios": "مقایسه سناریوهای جریان نقدی تنزیل‌شده",
  "Maintain ESG evidence and auditability throughout the lifecycle": "ثبت مستندات محیط زیست و قابلیت حسابرسی در طول پروژه",
  "Geologist Workbench": "میزکار زمین‌شناس",
  "Daily Operations": "عملیات روزانه",
  "Executive Portfolio": "سبد پروژه‌های مدیریتی",
  "Overview": "نمای کلی",
  "GIS Exploration Map": "نقشه اکتشاف",
  "Target Intelligence": "تحلیل اهداف اکتشافی",
  "Drillholes": "گمانه‌های حفاری",
  "Drillhole Manager": "مدیریت گمانه‌ها",
  "3D Subsurface": "مدل سه‌بعدی زیرسطح",
  "Geoscience": "علوم زمین",
  "AI Prospectivity": "پتانسیل‌یابی با هوش مصنوعی",
  "Data QA / QC": "کنترل کیفیت داده‌ها",
  "Geochemistry & Geophysics": "ژئوشیمی و ژئوفیزیک",
  "Geological inputs": "ورودی‌های زمین‌شناسی",
  "Economic Inputs": "ورودی‌های اقتصادی",
  "Risk Inputs": "ورودی‌های ریسک",
  "Valuation Inputs": "ورودی‌های ارزش‌گذاری",
  "Environmental & Social Inputs": "ورودی‌های محیط‌زیستی و اجتماعی",
  "Computational Outputs": "خروجی‌های محاسباتی",
  "Technology & Data Enablers": "ابزارها و داده‌های پشتیبان",
  "Technology Enablers": "ابزارهای پشتیبان",
  "Executive Value": "ارزش مدیریتی",
  "Inputs: Subsurface Reality": "ورودی‌ها: واقعیت زیرسطحی",
  "Existing target evidence": "شواهد موجود هدف",
  "Open target intelligence": "مشاهده تحلیل هدف",
  "Screening suggestion": "پیشنهاد ارزیابی اولیه",
  "Geological uncertainty proxy": "شاخص تقریبی عدم قطعیت زمین‌شناسی",
  "Illustrative EMV": "ارزش پولی مورد انتظار نمایشی",
  "Not a calibrated probability of discovery": "احتمال کشف واقعی و کالیبره‌شده نیست",
  "Assumption product (PoS proxy)": "ترکیب فرضیات (شاخص تقریبی موفقیت)",
  "Exploration budget ($M)": "بودجه اکتشاف (میلیون دلار)",
  "Success case value ($M)": "ارزش در صورت موفقیت (میلیون دلار)",
  "Timeline (months)": "زمان‌بندی (ماه)",
  "Expected monetary value (simplified)": "ارزش پولی مورد انتظار (ساده‌شده)",
  "Risk vs Expected Value": "ریسک در برابر ارزش مورد انتظار",
  "Quick Win": "دستاورد سریع",
  "Transformational": "تحول‌آفرین",
  "Deprioritize": "کاهش اولویت",
  "Strategic Bet": "سرمایه‌گذاری راهبردی",
  "Current quadrant:": "موقعیت فعلی:",
  "Low risk · Low EMV": "ریسک کم · ارزش کم",
  "Low risk · High EMV": "ریسک کم · ارزش بالا",
  "High risk · Low EMV": "ریسک بالا · ارزش کم",
  "High risk · High EMV": "ریسک بالا · ارزش بالا",
  "Geological uncertainty envelope": "دامنه عدم قطعیت زمین‌شناسی",
  "Conceptual volume uncertainty envelope": "دامنه عدم قطعیت حجم مفهومی",
  "Demo drillhole records": "اطلاعات نمایشی گمانه‌ها",
  "Case": "حالت",
  "Volume": "حجم",
  "Tonnage": "تناژ",
  "Metal*": "فلز*",
  "Conceptual 3D block model": "مدل بلوکی سه‌بعدی مفهومی",
  "Grid": "شبکه",
  "Mineralized shell": "محدوده کانه‌دار",
  "Modeling & data connections": "اتصالات مدل‌سازی و داده",
  "Open subsurface workspace": "مشاهده مدل زیرسطحی",
  "External references — not integrated": "ابزارهای خارجی — متصل نیستند",
  "Mid OPEX cut-off": "حد اقتصادی با هزینه عملیاتی متوسط",
  "Stripping ratio": "نسبت باطله‌برداری",
  "All-in operating proxy": "برآورد مجموع هزینه عملیاتی",
  "Break-even copper price": "قیمت سربه‌سر مس",
  "Grade–Tonnage Economic Curve": "منحنی اقتصادی عیار و تناژ",
  "Revenue per ore tonne": "درآمد هر تن کانسنگ",
  "Cost per ore tonne": "هزینه هر تن کانسنگ",
  "Contribution per tonne": "حاشیه سود هر تن",
  "Annual contribution proxy": "برآورد سود عملیاتی سالانه",
  "CAPEX assumption": "فرض سرمایه‌گذاری اولیه",
  "Planning & Design Enablers": "ابزارهای برنامه‌ریزی و طراحی",
  "Baseline scenario proxy": "سناریوی مبنای تقریبی",
  "Largest sensitivity": "بیشترین حساسیت",
  "Matrix range": "دامنه ماتریس",
  "Tornado Chart: Outcome Sensitivity": "نمودار حساسیت عوامل",
  "Two-Way Sensitivity Matrix": "ماتریس حساسیت دوطرفه",
  "Executive Value & Integrations": "ارزش مدیریتی و یکپارچه‌سازی",
  "Downside": "حالت نامطلوب",
  "Upside": "حالت مطلوب",
  "Discounted NPV proxy": "برآورد ارزش خالص فعلی",
  "IRR proxy": "برآورد نرخ بازده داخلی",
  "Capital payback": "زمان بازگشت سرمایه",
  "Final cumulative cash flow": "مجموع نهایی جریان نقدی",
  "Annual Cash Flow": "جریان نقدی سالانه",
  "Production Start": "شروع تولید",
  "CAPEX Outflow": "هزینه سرمایه‌ای",
  "LOM Cash Flow": "جریان نقدی عمر معدن",
  "Years": "سال‌ها",
  "Cash flow ($M)": "جریان نقدی (میلیون دلار)",
  "Computation & Audit": "محاسبه و حسابرسی",
  "Executive value": "ارزش مدیریتی",
  "Model status": "وضعیت مدل",
  "Illustrative": "نمایشی",
  "Data provenance": "منشأ داده‌ها",
  "Synthetic": "ساختگی",
  "Independent engineering": "بررسی مهندسی مستقل",
  "Not performed": "انجام نشده",
  "Social license proxy": "شاخص پذیرش اجتماعی",
  "TRIFR illustration": "نمونه نرخ حوادث ثبت‌شدنی",
  "Permits reviewed": "مجوزهای بررسی‌شده",
  "Composite dashboard score": "امتیاز ترکیبی داشبورد",
  "Continuous ESG Audit": "پایش مستمر محیط زیست و حاکمیت",
  "Continuous audit checklist": "فهرست کنترل حسابرسی مستمر",
  "ESG PROFILE": "نمایه محیط زیست و حاکمیت",
  "SIMULATED DEMO DATA": "داده‌های نمایشی و ساختگی",
  "DEMONSTRATION DATA": "داده‌های نمایشی",
  "DEMONSTRATION ONLY": "صرفاً نمایشی",
  "SIMULATED DEMO ONLY": "فقط داده نمایشی",
  "ILLUSTRATIVE MODEL": "مدل نمونه",
  "DEMO · NO LIVE DATA": "نسخه نمایشی · بدون داده زنده",
  "SIMULATED · NOT CERTIFIED": "شبیه‌سازی‌شده · تأیید نشده",
  "UNCALIBRATED · DEMO ONLY": "کالیبره نشده · فقط نمایشی",
  "Presentation mode · sample datasets": "حالت ارائه · داده‌های نمونه",
  "Exploration Engine": "موتور اکتشاف",
  "COMMAND CENTER": "مرکز کنترل",
  "PROJECT": "پروژه",
  "DEMO DATA": "داده نمایشی",
  "Search target ID, name or commodity...": "جست‌وجوی شناسه هدف، نام یا ماده معدنی...",
  "No demo targets found": "هدف نمایشی پیدا نشد",
  "Export demo scenario JSON": "دریافت سناریوی نمونه",
  "Export illustrative economics JSON": "دریافت محاسبات اقتصادی نمونه",
  "Export assumptions & decision JSON": "دریافت فرضیات و تصمیم نمونه",
  "Export assumptions & annual cash flows": "دریافت فرضیات و جریان نقدی سالانه",
  "Export ESG demonstration snapshot": "دریافت گزارش محیط زیست نمونه",
  "Export scenario JSON": "دریافت سناریوی نمونه",
  "Not connected": "متصل نیست",
  "Scenario outcomes at high/low commodity prices and high/low CAPEX assumptions.": "نتایج سناریو با قیمت‌های بالا و پایین مواد معدنی و سرمایه‌گذاری اولیه.",
  "Exploration Operations": "عملیات اکتشاف",
  "Exploration program": "برنامه اکتشاف",
  "All projects": "همه پروژه‌ها",
  "Drilling performance": "عملکرد حفاری",
  "Daily target vs actual": "هدف روزانه در برابر عملکرد",
  "Program execution": "اجرای برنامه",
  "Operational registers": "دفاتر ثبت عملیات",
  "Search, filter and export exploration records": "جست‌وجو، فیلتر و خروجی اطلاعات اکتشاف",
  "Batch": "بسته",
  "Program": "برنامه",
  "Samples": "نمونه‌ها",
  "Due": "سررسید",
  "Lab status": "وضعیت آزمایشگاه",
  "Issue": "مشکل",
  "Finding": "یافته",
  "Owner": "مسئول",
  "Severity": "شدت",
  "Status": "وضعیت",
  "Task": "وظیفه",
  "Team": "تیم",
  "Priority": "اولویت",
  "Demo completion": "تکمیل نمایشی",
  "Action required": "نیازمند اقدام",
  "Next shift handoff": "تحویل شیفت بعدی",
  "Mark complete": "علامت‌گذاری انجام‌شده",
  "No records match your filters.": "هیچ اطلاعاتی با فیلترها مطابق نیست.",
  "Geoscience Workbench": "میزکار علوم زمین",
  "Full GIS map": "نقشه کامل",
  "Prospectivity map": "نقشه پتانسیل معدنی",
  "Inspect evidence": "بررسی شواهد",
  "Target screening": "غربال اهداف",
  "Commodity": "ماده معدنی",
  "All": "همه",
  "Export shortlist CSV": "خروجی فهرست منتخب",
  "Drillhole logging queue": "صف ثبت اطلاعات گمانه",
  "Depth": "عمق",
  "Logged": "ثبت‌شده",
  "Completion": "درصد تکمیل",
  "Sample & laboratory queue": "صف نمونه و آزمایشگاه",
  "Review QA/QC": "بازبینی کنترل کیفیت",
  "Exploration Portfolio": "سبد پروژه‌های اکتشاف",
  "Budget vs expenditure": "بودجه در برابر هزینه",
  "Export CSV": "دریافت سی‌اس‌وی",
  "Management attention": "موارد نیازمند توجه مدیران",
  "Program portfolio": "سبد برنامه‌ها",
  "Drilling progress": "پیشرفت حفاری",
  "Geochemistry": "ژئوشیمی",
  "Budget used": "بودجه مصرف‌شده",
  "Risks": "ریسک‌ها",
  "Go": "ادامه",
  "Hold": "توقف موقت",
  "Reject": "رد",
  "Gate 1": "مرحله ۱",
  "Gate 2": "مرحله ۲",
  "Gate 3": "مرحله ۳",
  "Gate 4": "مرحله ۴"
}
const substitutions: [string,string][] = [["Select a module to open its decision workspace. ESG and governance span all four gates.","برای ورود به هر ماژول روی آن کلیک کنید. نظارت محیط زیست در تمام مراحل انجام می‌شود."],["Scenario outcomes at high/low commodity prices and high/low CAPEX assumptions.","نتایج سناریو با قیمت‌های بالا و پایین مواد معدنی و سرمایه‌گذاری اولیه."],["Detailed simulated indicators and links to existing geoscience workspaces.","شاخص‌های نمایشی و دسترسی به صفحات تخصصی زمین‌شناسی."],["Transforming raw geological inputs into boardroom computational outputs.","تبدیل داده‌های زمین‌شناسی به نتایج قابل استفاده برای مدیران."],["From raw geological evidence to boardroom-ready financial scenarios.","از شواهد زمین‌شناسی تا سناریوهای مالی برای تصمیم مدیران."],["Maintain ESG evidence and auditability throughout the lifecycle","ثبت مستندات محیط زیست و قابلیت حسابرسی در طول پروژه"],["Shared inputs across all six modules · demonstration only","ورودی‌های مشترک بین شش ماژول · صرفاً نمایشی"],["Test operating assumptions and preliminary viability","بررسی هزینه‌های عملیات و توجیه اولیه اقتصادی"],["Explore resource potential and drilling uncertainty","بررسی ذخیره احتمالی و عدم قطعیت حفاری"],["Screen prospects and prioritize geological targets","بررسی محدوده‌ها و اولویت‌بندی اهداف زمین‌شناسی"],["EXPLORATION TO INVESTMENT · DECISION INTELLIGENCE","از اکتشاف تا سرمایه‌گذاری · تحلیل تصمیم"],["Stress-test outcomes against key uncertainties","بررسی نتیجه پروژه در شرایط نامطمئن"],["Compare discounted project cash-flow scenarios","مقایسه سناریوهای جریان نقدی تنزیل‌شده"],["The 6-Module Stage-Gate Decision Architecture","معماری تصمیم‌گیری شش‌ماژولی"],["Search, filter and export exploration records","جست‌وجو، فیلتر و خروجی اطلاعات اکتشاف"],["Not a calibrated probability of discovery","احتمال کشف واقعی و کالیبره‌شده نیست"],["Conceptual volume uncertainty envelope","دامنه عدم قطعیت حجم مفهومی"],["Search target ID, name or commodity...","جست‌وجوی شناسه هدف، نام یا ماده معدنی..."],["Export assumptions & annual cash flows","دریافت فرضیات و جریان نقدی سالانه"],["Expected monetary value (simplified)","ارزش پولی مورد انتظار (ساده‌شده)"],["External references — not integrated","ابزارهای خارجی — متصل نیستند"],["Continuous ESG & Governance Tracker","پایش مستمر محیط زیست و حاکمیت"],["Presentation mode · sample datasets","حالت ارائه · داده‌های نمونه"],["Tornado Chart: Outcome Sensitivity","نمودار حساسیت عوامل"],["Export illustrative economics JSON","دریافت محاسبات اقتصادی نمونه"],["Export assumptions & decision JSON","دریافت فرضیات و تصمیم نمونه"],["Export ESG demonstration snapshot","دریافت گزارش محیط زیست نمونه"],["Geological uncertainty envelope","دامنه عدم قطعیت زمین‌شناسی"],["Assumption product (PoS proxy)","ترکیب فرضیات (شاخص تقریبی موفقیت)"],["Executive Value & Integrations","ارزش مدیریتی و یکپارچه‌سازی"],["No records match your filters.","هیچ اطلاعاتی با فیلترها مطابق نیست."],["Environmental & Social Inputs","ورودی‌های محیط‌زیستی و اجتماعی"],["Geological uncertainty proxy","شاخص تقریبی عدم قطعیت زمین‌شناسی"],["Grade–Tonnage Economic Curve","منحنی اقتصادی عیار و تناژ"],["Modeling & data connections","اتصالات مدل‌سازی و داده"],["Stage-Gate Decision Center","مرکز تصمیم‌گیری مرحله‌ای"],["Technology & Data Enablers","ابزارها و داده‌های پشتیبان"],["Inputs: Subsurface Reality","ورودی‌ها: واقعیت زیرسطحی"],["Planning & Design Enablers","ابزارهای برنامه‌ریزی و طراحی"],["Two-Way Sensitivity Matrix","ماتریس حساسیت دوطرفه"],["Final cumulative cash flow","مجموع نهایی جریان نقدی"],["Continuous audit checklist","فهرست کنترل حسابرسی مستمر"],["Geochemistry & Geophysics","ژئوشیمی و ژئوفیزیک"],["Conceptual 3D block model","مدل بلوکی سه‌بعدی مفهومی"],["Open subsurface workspace","مشاهده مدل زیرسطحی"],["Annual contribution proxy","برآورد سود عملیاتی سالانه"],["Composite dashboard score","امتیاز ترکیبی داشبورد"],["SIMULATED · NOT CERTIFIED","شبیه‌سازی‌شده · تأیید نشده"],["Export demo scenario JSON","دریافت سناریوی نمونه"],["Sample & laboratory queue","صف نمونه و آزمایشگاه"],["Risk & Scenario Analyzer","تحلیل ریسک و سناریو"],["ESG & Governance Tracker","پایش محیط زیست و حاکمیت"],["Screening to feasibility","از ارزیابی اولیه تا امکان‌سنجی"],["Existing target evidence","شواهد موجود هدف"],["Open target intelligence","مشاهده تحلیل هدف"],["UNCALIBRATED · DEMO ONLY","کالیبره نشده · فقط نمایشی"],["Mining Economics Engine","موتور اقتصاد معدن"],["Open decision workspace","ورود به ماژول"],["Exploration budget ($M)","بودجه اکتشاف (میلیون دلار)"],["Success case value ($M)","ارزش در صورت موفقیت (میلیون دلار)"],["Break-even copper price","قیمت سربه‌سر مس"],["Baseline scenario proxy","سناریوی مبنای تقریبی"],["Independent engineering","بررسی مهندسی مستقل"],["Drillhole logging queue","صف ثبت اطلاعات گمانه"],["Risk vs Expected Value","ریسک در برابر ارزش مورد انتظار"],["Demo drillhole records","اطلاعات نمایشی گمانه‌ها"],["All-in operating proxy","برآورد مجموع هزینه عملیاتی"],["Contribution per tonne","حاشیه سود هر تن"],["Exploration Operations","عملیات اکتشاف"],["Daily target vs actual","هدف روزانه در برابر عملکرد"],["Exploration Evaluator","ارزیابی اکتشاف"],["Raw Geological Inputs","داده‌های خام زمین‌شناسی"],["Computational Outputs","خروجی‌های محاسباتی"],["Revenue per ore tonne","درآمد هر تن کانسنگ"],["No demo targets found","هدف نمایشی پیدا نشد"],["Operational registers","دفاتر ثبت عملیات"],["Exploration Portfolio","سبد پروژه‌های اکتشاف"],["Budget vs expenditure","بودجه در برابر هزینه"],["Bankable Feasibility","امکان‌سنجی بانکی"],["Connected workspaces","صفحات مرتبط"],["Continuous oversight","نظارت مستمر"],["Screening suggestion","پیشنهاد ارزیابی اولیه"],["High risk · High EMV","ریسک بالا · ارزش بالا"],["Discounted NPV proxy","برآورد ارزش خالص فعلی"],["Social license proxy","شاخص پذیرش اجتماعی"],["Continuous ESG Audit","پایش مستمر محیط زیست و حاکمیت"],["Export scenario JSON","دریافت سناریوی نمونه"],["Drilling performance","عملکرد حفاری"],["Geoscience Workbench","میزکار علوم زمین"],["Export shortlist CSV","خروجی فهرست منتخب"],["Management attention","موارد نیازمند توجه مدیران"],["Screening & Targets","غربالگری و اهداف"],["Module quick access","دسترسی سریع به ماژول‌ها"],["Geologist Workbench","میزکار زمین‌شناس"],["Executive Portfolio","سبد پروژه‌های مدیریتی"],["GIS Exploration Map","نقشه اکتشاف"],["Target Intelligence","تحلیل اهداف اکتشافی"],["Technology Enablers","ابزارهای پشتیبان"],["Low risk · High EMV","ریسک کم · ارزش بالا"],["High risk · Low EMV","ریسک بالا · ارزش کم"],["Largest sensitivity","بیشترین حساسیت"],["Computation & Audit","محاسبه و حسابرسی"],["SIMULATED DEMO DATA","داده‌های نمایشی و ساختگی"],["SIMULATED DEMO ONLY","فقط داده نمایشی"],["DEMO · NO LIVE DATA","نسخه نمایشی · بدون داده زنده"],["Exploration program","برنامه اکتشاف"],["Financial Valuator","ارزش‌گذاری مالی"],["Low risk · Low EMV","ریسک کم · ارزش کم"],["Cost per ore tonne","هزینه هر تن کانسنگ"],["TRIFR illustration","نمونه نرخ حوادث ثبت‌شدنی"],["DEMONSTRATION DATA","داده‌های نمایشی"],["DEMONSTRATION ONLY","صرفاً نمایشی"],["ILLUSTRATIVE MODEL","مدل نمونه"],["Exploration Engine","موتور اکتشاف"],["Next shift handoff","تحویل شیفت بعدی"],["Reserve Simulator","شبیه‌ساز ذخایر"],["Advanced Drilling","حفاری پیشرفته"],["Portfolio targets","اهداف اکتشافی"],["Simulated records","اطلاعات نمایشی"],["Drillhole Manager","مدیریت گمانه‌ها"],["Geological inputs","ورودی‌های زمین‌شناسی"],["Timeline (months)","زمان‌بندی (ماه)"],["Current quadrant:","موقعیت فعلی:"],["Mineralized shell","محدوده کانه‌دار"],["Program execution","اجرای برنامه"],["Prospectivity map","نقشه پتانسیل معدنی"],["Program portfolio","سبد برنامه‌ها"],["Drilling progress","پیشرفت حفاری"],["Across All Gates","در تمام مراحل"],["Decision modules","ماژول‌های تصمیم‌گیری"],["Governance scope","دامنه نظارت"],["Daily Operations","عملیات روزانه"],["AI Prospectivity","پتانسیل‌یابی با هوش مصنوعی"],["Valuation Inputs","ورودی‌های ارزش‌گذاری"],["Illustrative EMV","ارزش پولی مورد انتظار نمایشی"],["Transformational","تحول‌آفرین"],["Mid OPEX cut-off","حد اقتصادی با هزینه عملیاتی متوسط"],["CAPEX assumption","فرض سرمایه‌گذاری اولیه"],["Annual Cash Flow","جریان نقدی سالانه"],["Production Start","شروع تولید"],["Permits reviewed","مجوزهای بررسی‌شده"],["Inspect evidence","بررسی شواهد"],["Target screening","غربال اهداف"],["Financial Value","ارزش مالی"],["Pre-Feasibility","پیش‌امکان‌سنجی"],["Risk Assessment","ارزیابی ریسک"],["Economic Inputs","ورودی‌های اقتصادی"],["Executive Value","ارزش مدیریتی"],["Stripping ratio","نسبت باطله‌برداری"],["Capital payback","زمان بازگشت سرمایه"],["Executive value","ارزش مدیریتی"],["Data provenance","منشأ داده‌ها"],["Demo completion","تکمیل نمایشی"],["Action required","نیازمند اقدام"],["Cash flow ($M)","جریان نقدی (میلیون دلار)"],["COMMAND CENTER","مرکز کنترل"],["3D Subsurface","مدل سه‌بعدی زیرسطح"],["Strategic Bet","سرمایه‌گذاری راهبردی"],["CAPEX Outflow","هزینه سرمایه‌ای"],["LOM Cash Flow","جریان نقدی عمر معدن"],["Not performed","انجام نشده"],["Not connected","متصل نیست"],["Mark complete","علامت‌گذاری انجام‌شده"]]

function translate(source: string): string {
  const trimmed = source.trim()
  if (!trimmed || !/[A-Za-z]/.test(trimmed)) return source
  let result = dictionary[trimmed]
  if (!result) {
    result = trimmed
    for (const [en, fa] of substitutions) {
      if (result.includes(en)) result = result.split(en).join(fa)
    }
  }
  if (result === trimmed) return source
  return source.replace(trimmed,result)
}

export function localizeApp(root: HTMLElement, language: Language): () => void {
  const originals = new WeakMap<Text,string>()
  const placeholders = new WeakMap<Element,string>()
  const ignored = 'script,style,code,pre,svg,option,textarea,[data-no-translate]'
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement
      if (!parent || parent.closest(ignored)) return
      const text = node as Text
      const prev = originals.get(text)
      if (prev === undefined) originals.set(text,text.data)
      else if (text.data !== translate(prev)) originals.set(text,text.data)
      const original = originals.get(text) ?? text.data
      const desired = language === 'fa' ? translate(original) : original
      if (text.data !== desired) text.data = desired
    } else if (node instanceof Element) {
      if (node.matches(ignored)) return
      if (node.matches('input[placeholder]')) {
        const prior = placeholders.get(node) ?? node.getAttribute('placeholder') ?? ''
        if (!placeholders.has(node)) placeholders.set(node, prior)
        const wanted = language === 'fa' ? translate(prior) : prior
        if (node.getAttribute('placeholder') !== wanted) node.setAttribute('placeholder',wanted)
      }
      for (const child of Array.from(node.childNodes)) visit(child)
    }
  }
  visit(root)
  const observer = new MutationObserver(records => {
    observer.disconnect()
    for (const record of records) {
      if (record.type === 'characterData') visit(record.target)
      else if (record.type === 'childList') for (const node of Array.from(record.addedNodes)) visit(node)
      else if (record.type === 'attributes') visit(record.target)
    }
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder']})
  })
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder']})
  return () => { observer.disconnect(); /* Component unmount disposes observer */ }
}
