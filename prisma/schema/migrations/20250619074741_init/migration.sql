-- CreateTable
CREATE TABLE `Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(191) NOT NULL,
    `company_full` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `logo_url` VARCHAR(191) NULL,

    UNIQUE INDEX `Company_company_name_key`(`company_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyDomainMapping` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `domain` ENUM('CONSULTING', 'FINANCE', 'MARKETING', 'PRODMAN', 'OPERATIONS', 'GENMAN') NOT NULL,

    UNIQUE INDEX `CompanyDomainMapping_company_id_domain_key`(`company_id`, `domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company_Info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `brief_content` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Company_Info_company_id_key`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company_Alum_Exp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `company_id` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `is_approved` BOOLEAN NOT NULL DEFAULT false,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company_Compendium` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `pdf_id` INTEGER NOT NULL,

    UNIQUE INDEX `Company_Compendium_company_id_key`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company_Compendium_Pdf_Path` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `compendium_id` INTEGER NOT NULL,
    `pdf_path` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_jd` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` INTEGER NOT NULL,
    `placement_cycle_id` INTEGER NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `pdf_path` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Company_JD_company_id_placement_cycle_id_role_key`(`company_id`, `placement_cycle_id`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyJD_Domain` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_jd_id` VARCHAR(191) NOT NULL,
    `domain` ENUM('CONSULTING', 'FINANCE', 'MARKETING', 'PRODMAN', 'OPERATIONS', 'GENMAN') NOT NULL,

    UNIQUE INDEX `CompanyJD_Domain_company_jd_id_domain_key`(`company_jd_id`, `domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `News` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `link_to_source` VARCHAR(191) NULL,
    `path_to_image` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_approved` BOOLEAN NOT NULL DEFAULT false,
    `news_tag` ENUM('BUSINESS_ECONOMY', 'FINANCE_MARKETS', 'TECHNOLOGY_INNOVATION', 'STARTUPS_ENTREPRENEURSHIP', 'CONSULTING_STRATEGY', 'MARKETING_ADVERTISING', 'PRODUCT_MANAGEMENT_DESIGN', 'OPERATIONS_SUPPLY_CHAIN', 'HUMAN_RESOURCES_CAREERS', 'GENERAL_MANAGEMENT_LEADERSHIP', 'GOVERNMENT_POLICY', 'INTERNATIONAL_AFFAIRS', 'ENVIRONMENT_SUSTAINABILITY', 'LEGAL_COMPLIANCE', 'EDUCATION_RESEARCH', 'OTHER') NOT NULL,
    `subdomain_tag` ENUM('CORPORATE_STRATEGY', 'INDUSTRY_REPORTS', 'BUSINESS_MODELS', 'MERGERS_ACQUISITIONS', 'JOINT_VENTURES', 'COMPANY_EARNINGS', 'BUSINESS_REGULATIONS', 'GLOBAL_TRADE', 'FAMILY_BUSINESS', 'MSME_INSIGHTS', 'STOCK_MARKETS', 'BONDS_FIXED_INCOME', 'COMMODITIES', 'CRYPTO_BLOCKCHAIN', 'BANKING_NBFC', 'PERSONAL_FINANCE', 'MA_FINANCING', 'CORPORATE_FINANCE', 'TAXATION', 'FINANCE_REGULATIONS', 'AI_ML', 'CYBERSECURITY', 'SOFTWARE_SAAS', 'CLOUD_COMPUTING', 'QUANTUM_COMPUTING', 'BLOCKCHAIN_TECH', 'IOT', 'ROBOTICS_AUTOMATION', 'TECH_POLICY', 'HARDWARE_CHIPS', 'FUNDRAISING', 'DEMO_DAY', 'ACCELERATORS', 'FOUNDER_STORIES', 'UNICORN_TRACKER', 'MARKET_ENTRY', 'PIVOTS', 'STARTUP_POLICY', 'COMPETITIVE_STRATEGY', 'MARKET_EXPANSION', 'COST_OPTIMIZATION', 'CHANGE_MANAGEMENT', 'DIGITAL_TRANSFORMATION', 'ORG_DESIGN', 'BENCHMARKING', 'STRATEGY_CASES', 'CAMPAIGNS', 'BRAND_POSITIONING', 'CONSUMER_INSIGHTS', 'DIGITAL_MARKETING', 'ADTECH_MARTECH', 'INFLUENCER_MARKETING', 'CONTENT_STRATEGY', 'CUSTOMER_EXPERIENCE', 'PRODUCT_LAUNCH', 'UX_UI', 'FEATURE_PLANNING', 'AGILE_SCRUM', 'DESIGN_THINKING', 'USER_RESEARCH', 'PRODUCT_METRICS', 'MONETIZATION', 'PROCUREMENT', 'INVENTORY', 'LOGISTICS', 'SUPPLY_CHAIN_RESILIENCE', 'AUTOMATION_OPS', 'VENDOR_MANAGEMENT', 'LEAN_SIX_SIGMA', 'COST_EFFICIENCY', 'HIRING_TRENDS', 'WORK_CULTURE', 'PERFORMANCE_MANAGEMENT', 'LEARNING_UPSKILLING', 'COMPENSATION_BENEFITS', 'EMPLOYEE_WELLNESS', 'HR_TECH', 'REMOTE_HYBRID_WORK', 'LEADERSHIP_CHANGES', 'EXECUTIVE_VIEWS', 'CORPORATE_GOVERNANCE', 'SUCCESSION', 'STRATEGIC_VISION', 'LEADERSHIP_STYLES', 'BUSINESS_LAWS', 'FDI_POLICY', 'DIGITAL_REGULATIONS', 'LABOR_CODES', 'PUBLIC_PARTNERSHIPS', 'SCHEMES', 'SECTOR_REFORMS', 'TRADE_WARS', 'BILATERAL_RELATIONS', 'GLOBAL_SANCTIONS', 'WORLD_ORGS', 'CROSS_BORDER_INVESTMENTS', 'EMERGING_MARKETS', 'SUPPLY_CHAIN_GLOBAL', 'ESG', 'CLIMATE_POLICY', 'RENEWABLES', 'CARBON_TRADING', 'GREEN_FINANCE', 'SUSTAINABLE_SUPPLY', 'CIRCULAR_ECONOMY', 'CORPORATE_LITIGATION', 'ANTITRUST', 'IP_LAW', 'CONTRACT_DISPUTES', 'LEGAL_TECH', 'REGULATORY_FILINGS', 'WHISTLEBLOWER', 'INDUSTRY_ACADEMIA', 'EDTECH', 'RESEARCH_FUNDING', 'ONLINE_LEARNING', 'EDUCATION_POLICY', 'SKILL_GAP', 'MOOCS', 'OTHER') NULL,
    `author_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `News_Company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `news_id` VARCHAR(191) NOT NULL,
    `company_id` INTEGER NOT NULL,

    UNIQUE INDEX `News_Company_news_id_company_id_key`(`news_id`, `company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `News_Domain` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `news_id` VARCHAR(191) NOT NULL,
    `domain` ENUM('CONSULTING', 'FINANCE', 'MARKETING', 'PRODMAN', 'OPERATIONS', 'GENMAN') NOT NULL,

    UNIQUE INDEX `News_Domain_news_id_domain_key`(`news_id`, `domain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Placement_Cycle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `placement_type` ENUM('SUMMERS', 'HEPP', 'FINALS') NOT NULL,
    `year` INTEGER NOT NULL,
    `batch_name` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserDomainPreference` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `domain_1` ENUM('CONSULTING', 'FINANCE', 'MARKETING', 'PRODMAN', 'OPERATIONS', 'GENMAN') NOT NULL,
    `domain_2` ENUM('CONSULTING', 'FINANCE', 'MARKETING', 'PRODMAN', 'OPERATIONS', 'GENMAN') NOT NULL,
    `domain_3` ENUM('CONSULTING', 'FINANCE', 'MARKETING', 'PRODMAN', 'OPERATIONS', 'GENMAN') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserDomainPreference_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role_Permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` ENUM('STUDENT', 'SUPER_STUDENT', 'ALUMNI', 'DISHA', 'CCA_CONSULT', 'CCA_FINANCE', 'CCA_PRODMAN', 'CCA_OPERATIONS', 'CCA_GENMAN', 'CCA_MARKETING', 'PLACECOM', 'ADMIN') NOT NULL,
    `description` VARCHAR(191) NULL,

    UNIQUE INDEX `Role_Permission_role_key`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermissionMap` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_permission_id` INTEGER NOT NULL,
    `permission` ENUM('MANAGE_COMPANY_LIST', 'MANAGE_NEWS', 'MANAGE_PLACEMENT_CYCLE', 'MANAGE_COMPANY_JD', 'MANAGE_MY_COHORT', 'ENABLE_MY_SECTION', 'ENABLE_COMPANY_DIRECTORY', 'ENABLE_NEWS', 'ENABLE_CV_PREP', 'EDIT_CV_PREP', 'ENABLE_DOMAIN_PREP', 'EDIT_DOMAIN_PREP', 'ENABLE_AI_MOCK', 'ENABLE_PROFILE', 'ENABLE_MY_CV', 'ENABLE_ANNOUNCEMENTS', 'ENABLE_NOTIFICATIONS', 'ENABLE_PREFERENCES', 'MANAGE_ANNOUNCEMENTS', 'MANAGE_EMAIL', 'EDIT_COMPANY_INFO', 'ADD_ALUMNI_EXP', 'MANAGE_ALUMNI_EXP') NOT NULL,

    UNIQUE INDEX `RolePermissionMap_role_permission_id_permission_key`(`role_permission_id`, `permission`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shortlist` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `chitragupta_name` VARCHAR(191) NOT NULL,
    `company_id` INTEGER NULL,
    `role` VARCHAR(191) NOT NULL,
    `round` INTEGER NOT NULL,
    `type` ENUM('SL', 'ESL') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `pgpid` VARCHAR(191) NULL,
    `pcomid` VARCHAR(191) NULL,
    `email_id` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('STUDENT', 'SUPER_STUDENT', 'ALUMNI', 'DISHA', 'CCA_CONSULT', 'CCA_FINANCE', 'CCA_PRODMAN', 'CCA_OPERATIONS', 'CCA_GENMAN', 'CCA_MARKETING', 'PLACECOM', 'ADMIN') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_login` DATETIME(3) NULL,

    UNIQUE INDEX `User_pgpid_key`(`pgpid`),
    UNIQUE INDEX `User_email_id_key`(`email_id`),
    UNIQUE INDEX `User_pgpid_pcomid_key`(`pgpid`, `pcomid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DishaMentee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `mentor_id` INTEGER NULL,
    `placement_cycle_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DishaMentee_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShadowPair` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user1Id` INTEGER NOT NULL,
    `user2Id` INTEGER NOT NULL,

    UNIQUE INDEX `ShadowPair_user1Id_key`(`user1Id`),
    UNIQUE INDEX `ShadowPair_user2Id_key`(`user2Id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserLanguage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `language` ENUM('ENGLISH', 'HINDI', 'TAMIL', 'TELUGU', 'BENGALI', 'KANNADA', 'MARATHI', 'MALAYALAM', 'GUJARATI', 'PUNJABI', 'FRENCH', 'GERMAN', 'SPANISH', 'MANDARIN', 'JAPANESE', 'KOREAN', 'ARABIC', 'RUSSIAN', 'PORTUGUESE', 'ITALIAN', 'OTHER') NOT NULL,
    `proficiency` ENUM('BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserLanguage_user_id_language_key`(`user_id`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company_Video` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `company_id` INTEGER NOT NULL,
    `video_url` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Company_Video_company_id_video_url_key`(`company_id`, `video_url`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ShortlistUsers` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ShortlistUsers_AB_unique`(`A`, `B`),
    INDEX `_ShortlistUsers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CompanyDomainMapping` ADD CONSTRAINT `CompanyDomainMapping_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company_Info` ADD CONSTRAINT `Company_Info_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company_Alum_Exp` ADD CONSTRAINT `Company_Alum_Exp_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company_Alum_Exp` ADD CONSTRAINT `Company_Alum_Exp_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company_Compendium` ADD CONSTRAINT `Company_Compendium_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company_Compendium_Pdf_Path` ADD CONSTRAINT `Company_Compendium_Pdf_Path_compendium_id_fkey` FOREIGN KEY (`compendium_id`) REFERENCES `Company_Compendium`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_jd` ADD CONSTRAINT `Company_JD_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_jd` ADD CONSTRAINT `Company_JD_placement_cycle_id_fkey` FOREIGN KEY (`placement_cycle_id`) REFERENCES `Placement_Cycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyJD_Domain` ADD CONSTRAINT `CompanyJD_Domain_company_jd_id_fkey` FOREIGN KEY (`company_jd_id`) REFERENCES `company_jd`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `News` ADD CONSTRAINT `News_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `News_Company` ADD CONSTRAINT `News_Company_news_id_fkey` FOREIGN KEY (`news_id`) REFERENCES `News`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `News_Company` ADD CONSTRAINT `News_Company_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `News_Domain` ADD CONSTRAINT `News_Domain_news_id_fkey` FOREIGN KEY (`news_id`) REFERENCES `News`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDomainPreference` ADD CONSTRAINT `UserDomainPreference_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermissionMap` ADD CONSTRAINT `RolePermissionMap_role_permission_id_fkey` FOREIGN KEY (`role_permission_id`) REFERENCES `Role_Permission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shortlist` ADD CONSTRAINT `Shortlist_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DishaMentee` ADD CONSTRAINT `DishaMentee_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DishaMentee` ADD CONSTRAINT `DishaMentee_mentor_id_fkey` FOREIGN KEY (`mentor_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DishaMentee` ADD CONSTRAINT `DishaMentee_placement_cycle_id_fkey` FOREIGN KEY (`placement_cycle_id`) REFERENCES `Placement_Cycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShadowPair` ADD CONSTRAINT `ShadowPair_user1Id_fkey` FOREIGN KEY (`user1Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShadowPair` ADD CONSTRAINT `ShadowPair_user2Id_fkey` FOREIGN KEY (`user2Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserLanguage` ADD CONSTRAINT `UserLanguage_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company_Video` ADD CONSTRAINT `Company_Video_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ShortlistUsers` ADD CONSTRAINT `_ShortlistUsers_A_fkey` FOREIGN KEY (`A`) REFERENCES `Shortlist`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ShortlistUsers` ADD CONSTRAINT `_ShortlistUsers_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
