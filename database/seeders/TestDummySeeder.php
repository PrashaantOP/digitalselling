<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * TESTING ONLY seeder.
 *
 * Creates dummy user test@gmail.com / test@12345 with a store, one product of every type
 * and data in every app table. Column names / enums / NOT NULL fields strictly follow the
 * migrations (no more silent column filtering - a wrong column will now fail loudly).
 *
 * Idempotent: every row is looked up by a natural key and updated, otherwise inserted.
 * Run: php artisan db:seed --class=TestDummySeeder
 */
class TestDummySeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $now = now();

            // ---------- 1. USERS ----------
            $userId = $this->upsert('users', ['email' => 'test@gmail.com'], [
                'name' => 'Test Creator',
                'password' => Hash::make('test@12345'),
                'phone' => '9820012345',
                'country_code' => '+91',
                'username' => 'testcreator',
                'role' => 'creator',
                'plan' => 'pro',
                'status' => 'active',
                'email_verified_at' => $now,
                'phone_verified_at' => $now,
            ]);

            // second creator: referral demo
            $friendId = $this->upsert('users', ['email' => 'friend@gmail.com'], [
                'name' => 'Friend Creator',
                'password' => Hash::make('test@12345'),
                'phone' => '9711288492',
                'country_code' => '+91',
                'username' => 'friendcreator',
                'role' => 'creator',
                'plan' => 'free',
                'status' => 'active',
                'email_verified_at' => $now,
            ]);

            // sub-admin of test creator
            $helperId = $this->upsert('users', ['email' => 'helper@gmail.com'], [
                'name' => 'Test Helper',
                'password' => Hash::make('test@12345'),
                'phone' => '9000000001',
                'country_code' => '+91',
                'username' => 'testhelper',
                'role' => 'sub_admin',
                'parent_creator_id' => $userId,
                'plan' => 'free',
                'status' => 'active',
                'email_verified_at' => $now,
            ]);

            // ---------- 2. STORE ----------
            $storeId = $this->upsert('stores', ['user_id' => $userId], [
                'username' => 'testcreator',
                'display_name' => "Test Creator's Store",
                'bio' => 'Design educator selling courses, books and 1:1 mentorship.',
                'avatar' => null,
                'welcome_message' => 'Welcome to my store 🚀',
                'header_heading' => 'Join 10,000+ creators learning design',
                'is_live' => true,
                'column_layout' => 'single',
                'sensitive_content_warning' => false,
                'meta_title' => 'Test Creator — Creator Store',
                'meta_description' => 'Courses, e-books and mentorship.',
                'fb_pixel_id' => null,
                'ga_tracking_id' => null,
            ]);

            $this->upsert('store_appearances', ['store_id' => $storeId], [
                'theme' => 'classic',
                'brand_color' => '#4F46E5',
                'font_family' => 'Inter',
                'custom_background_path' => null,
            ]);
            $this->upsert('store_social_links', ['store_id' => $storeId, 'platform' => 'instagram'], [
                'url' => 'https://instagram.com/testcreator',
                'sort_order' => 1,
            ]);
            $this->upsert('store_social_links', ['store_id' => $storeId, 'platform' => 'youtube'], [
                'url' => 'https://youtube.com/@testcreator',
                'sort_order' => 2,
            ]);
            $this->upsert('store_header_buttons', ['store_id' => $storeId, 'label' => 'Join WhatsApp'], [
                'url' => 'https://wa.me/919820012345',
                'icon' => null,
                'sort_order' => 1,
            ]);

            // ---------- 3. PLAN / SUBSCRIPTION / BILLING / NOTIFICATIONS ----------
            $planId = $this->upsert('subscription_plans', ['slug' => 'pro-monthly'], [
                'name' => 'Pro Monthly',
                'monthly_price' => 499,
                'commission_rate' => 0.00,
                'features' => json_encode(['0% fee', 'custom domain']),
                'is_active' => true,
            ]);
            $subscriptionId = $this->upsert('subscriptions', ['user_id' => $userId, 'plan_id' => $planId], [
                'status' => 'active',
                'gateway' => 'razorpay',
                'gateway_subscription_id' => 'sub_TEST001',
                'current_period_start' => $now->toDateString(),
                'current_period_end' => $now->copy()->addMonth()->toDateString(),
                'cancelled_at' => null,
            ]);
            // billing_invoices has only created_at (no updated_at)
            $this->upsert('billing_invoices', ['invoice_number' => 'INV-TEST-001'], [
                'user_id' => $userId,
                'subscription_id' => $subscriptionId,
                'amount' => 499,
                'status' => 'paid',
                'paid_at' => $now,
                'pdf_path' => null,
                'created_at' => $now,
            ], false);
            $this->upsert('notification_preferences', ['user_id' => $userId], [
                'course_enrollment' => true,
                'course_completion' => true,
                'new_messages' => true,
                'payment_received' => true,
                'weekly_digest' => false,
            ]);

            // ---------- 4. PAYOUT PROFILE / METHODS / KYC / PAYOUTS ----------
            $this->upsert('payout_profiles', ['user_id' => $userId], [
                'full_name' => 'Test Creator',
                'business_name' => "Test Creator's Academy",
                'email' => 'test@gmail.com',
                'profession' => 'Design Educator',
            ]);
            $upiId = $this->upsert('payout_methods', ['user_id' => $userId, 'type' => 'upi'], [
                'upi_id' => 'testcreator@okhdfcbank',
                'account_holder_name' => null,
                'account_number' => null,
                'ifsc' => null,
                'is_default' => true,
            ]);
            $this->upsert('payout_methods', ['user_id' => $userId, 'type' => 'bank_transfer'], [
                'upi_id' => null,
                'account_holder_name' => 'Test Creator',
                'account_number' => '50100212345678',
                'ifsc' => 'HDFC0001234',
                'is_default' => false,
            ]);
            $this->upsert('kyc_verifications', ['user_id' => $userId], [
                'legal_name' => 'Test Creator',
                'pan_number' => 'ABCDE1234F',
                'gst_number' => null,
                'bank_account_holder' => 'Test Creator',
                'bank_account_number' => '50100212345678',
                'ifsc' => 'HDFC0001234',
                'id_document_path' => null,
                'status' => 'verified',
                'rejection_reason' => null,
                'submitted_at' => $now,
                'verified_at' => $now,
            ]);
            $this->upsert('payouts', ['user_id' => $userId, 'reference_number' => 'PO-TEST-001'], [
                'payout_method_id' => $upiId,
                'amount' => 34500,
                'status' => 'pending',
                'notes' => 'Test payout',
                'requested_at' => $now,
                'processed_at' => null,
            ]);

            // ---------- 5. REFERRALS ----------
            $this->upsert('referral_codes', ['user_id' => $userId], [
                'code' => 'TEST100',
            ]);
            $this->upsert('referrals', ['referrer_id' => $userId, 'referred_user_id' => $friendId], [
                'status' => 'earning',
                'total_earnings' => 100,
                'joined_at' => $now,
            ]);

            // ---------- 6. CUSTOMERS ----------
            $customers = [
                ['Aarav Sharma', 'aarav@test.com', '9820144321'],
                ['Priya Sundaram', 'priya@test.com', '9711288492'],
                ['Rohan Kulkarni', 'rohan@test.com', '9930412847'],
                ['Neha Mishra', 'neha@test.com', '9845067123'],
                ['Vikram Kapoor', 'vikram@test.com', '9422091823'],
                ['Tanvi Deshmukh', 'tanvi@test.com', '9819033412'],
                ['Siddharth Sen', 'sid@test.com', '9920055182'],
            ];
            $customerIds = [];
            foreach ($customers as [$cname, $cemail, $cphone]) {
                // totals are recalculated from orders at the end
                $customerIds[] = $this->upsert('customers', ['creator_id' => $userId, 'phone' => $cphone], [
                    'name' => $cname,
                    'email' => $cemail,
                    'joined_at' => $now,
                ]);
            }

            // ---------- 7. VISITORS / PAGE VIEWS / LINK CLICKS (no timestamps columns) ----------
            $visitorDefs = [
                ['sess-test-1', '9820144321', 'Aarav Sharma', true, 'mobile', 'Chrome', 'Mumbai'],
                ['sess-test-2', null, null, false, 'desktop', 'Safari', 'Pune'],
                ['sess-test-3', null, null, false, 'mobile', 'Chrome', 'Delhi'],
            ];
            $visitorIds = [];
            foreach ($visitorDefs as [$token, $vphone, $vname, $isCustomer, $device, $browser, $city]) {
                $visitorIds[] = $this->upsert('visitors', ['store_id' => $storeId, 'session_token' => $token], [
                    'phone' => $vphone,
                    'name' => $vname,
                    'is_customer' => $isCustomer,
                    'visits_count' => 5,
                    'pages_count' => 12,
                    'country' => 'India',
                    'city' => $city,
                    'device' => $device,
                    'browser' => $browser,
                    'first_seen_at' => $now,
                    'last_seen_at' => $now,
                ], false);
            }

            if (!DB::table('store_page_views')->where('store_id', $storeId)->exists()) {
                $paths = ['/testcreator', '/testcreator/design-system-masterclass-2024', '/testcreator/figma-tokens-guide'];
                $rows = [];
                for ($i = 0; $i < 30; $i++) {
                    $rows[] = [
                        'store_id' => $storeId,
                        'visitor_id' => $visitorIds[$i % 3],
                        'page_path' => $paths[$i % 3],
                        'referrer' => $i % 2 ? 'https://instagram.com' : null,
                        'viewed_at' => $now->copy()->subDays($i % 14)->subMinutes($i * 7),
                    ];
                }
                DB::table('store_page_views')->insert($rows);
            }
            if (!DB::table('store_link_clicks')->where('store_id', $storeId)->exists()) {
                $labels = ['Buy Now', 'Join WhatsApp', 'Instagram'];
                $rows = [];
                for ($i = 0; $i < 12; $i++) {
                    $rows[] = [
                        'store_id' => $storeId,
                        'visitor_id' => $visitorIds[$i % 3],
                        'element_label' => $labels[$i % 3],
                        'clicked_at' => $now->copy()->subDays($i % 7)->subMinutes($i * 11),
                    ];
                }
                DB::table('store_link_clicks')->insert($rows);
            }

            // ---------- 8. PRODUCTS (one of each type) ----------
            // products.slug is globally unique; 'booking' products keep slug NULL (see slug migration)
            $productDefs = [
                ['course', 'Design System Masterclass 2024', 'design-system-masterclass-2024', 14999],
                ['event', 'Design Systems Architect Conf 2024', 'design-conf-2024', 4999],
                ['book', 'Figma Auto-Layout & Tokens Guide', 'figma-tokens-guide', 799],
                ['locked_content', 'Enterprise Token Repo & Multi-Brand', 'enterprise-tokens', 3499],
                ['payment_page', 'Kiln Creator Community Pass', 'community-pass', 1999],
                ['booking', '1:1 Portfolio & Career Mentorship', null, 2499],
            ];
            $productIds = [];
            $questionIds = [];
            foreach ($productDefs as [$type, $title, $slug, $price]) {
                $where = $slug !== null
                    ? ['slug' => $slug]
                    : ['creator_id' => $userId, 'type' => $type, 'title' => $title];

                $pid = $this->upsert('products', $where, [
                    'creator_id' => $userId,
                    'type' => $type,
                    'title' => $title,
                    'slug' => $slug,
                    'status' => 'published',
                    'cover_type' => 'image',
                    'cover_video_url' => null,
                    'description' => "Dummy $type for testing.",
                    'pricing_type' => 'fixed',
                    'price' => $price,
                    'has_discount' => false,
                    'discounted_price' => null,
                    'button_text' => 'Buy now',
                    'theme' => 'classic',
                    'accent_color' => '#4F46E5',
                    'post_purchase_message' => 'Thanks for buying!',
                    'terms_and_conditions' => 'Test terms',
                    'refund_policy' => 'Test refunds',
                    'privacy_policy' => 'Test privacy',
                    'fb_pixel_id' => null,
                    'ga_tracking_id' => null,
                    'sales_count' => 5,
                    'revenue_total' => $price * 5,
                    'views_count' => 100,
                    'published_at' => $now,
                ]);
                $productIds[$type] = $pid;

                $this->upsert('product_cover_images', ['product_id' => $pid, 'image_path' => 'covers/dummy.jpg'], [
                    'sort_order' => 1,
                ]);
                $this->upsert('coupons', ['product_id' => $pid, 'code' => 'TEST10-' . strtoupper($type)], [
                    'discount_percent' => 10,
                    'usage_limit' => 100,
                    'used_count' => 2,
                    'expires_at' => $now->copy()->addMonth(),
                    'is_active' => true,
                ]);
                $questionIds[$type] = $this->upsert('checkout_questions', ['product_id' => $pid, 'label' => 'Where did you hear about us?'], [
                    'field_type' => 'text',
                    'options' => null,
                    'is_required' => false,
                    'sort_order' => 1,
                ]);
            }

            // every other product can offer the book as add-on
            foreach ($productIds as $type => $pid) {
                if ($type === 'book') {
                    continue;
                }
                $this->upsert('product_addons', ['product_id' => $pid, 'addon_product_id' => $productIds['book']], []);
            }

            // ---------- 9. ORDERS ----------
            // [order_no, product type, customer index, base amount, status, addon amount]
            $orderDefs = [
                ['KLN-TEST-001', 'course', 0, 14999, 'success', 799],   // with book add-on
                ['KLN-TEST-002', 'booking', 1, 2499, 'success', 0],
                ['KLN-TEST-003', 'book', 2, 799, 'success', 0],
                ['KLN-TEST-004', 'event', 3, 4999, 'success', 0],
                ['KLN-TEST-005', 'locked_content', 4, 3499, 'pending', 0],
                ['KLN-TEST-006', 'payment_page', 5, 1999, 'success', 0],
                ['KLN-TEST-007', 'course', 6, 14999, 'failed', 0],
                ['KLN-TEST-008', 'locked_content', 1, 3499, 'success', 0], // successful order used for unlock
            ];
            $orderIds = [];
            foreach ($orderDefs as [$ono, $type, $cidx, $base, $status, $addon]) {
                [$bname, $bemail, $bphone] = $customers[$cidx];
                $total = $base + $addon;
                $fee = round($total * 0.03, 2);

                $oid = $this->upsert('orders', ['order_number' => $ono], [
                    'creator_id' => $userId,
                    'customer_id' => $customerIds[$cidx],
                    'product_id' => $productIds[$type],
                    'buyer_name' => $bname,
                    'buyer_email' => $bemail,
                    'buyer_phone' => $bphone,
                    'buyer_gstin' => null,
                    'buyer_state' => 'Maharashtra',
                    'coupon_id' => null,
                    'base_amount' => $base,
                    'discount_amount' => 0,
                    'addon_amount' => $addon,
                    'total_amount' => $total,
                    'commission_rate' => 3.00,
                    'platform_fee' => $fee,
                    'net_payout_amount' => $total - $fee,
                    'payment_gateway' => 'razorpay',
                    'gateway_order_id' => 'order_' . $ono,
                    'gateway_payment_id' => $status === 'success' ? 'pay_' . $ono : null,
                    'status' => $status,
                    'paid_at' => $status === 'success' ? $now : null,
                ]);
                $orderIds[$ono] = $oid;

                if ($addon > 0) {
                    $this->upsert('order_addon_items', ['order_id' => $oid, 'addon_product_id' => $productIds['book']], [
                        'price' => $addon,
                    ]);
                }
                $this->upsert('order_checkout_answers', ['order_id' => $oid, 'checkout_question_id' => $questionIds[$type]], [
                    'answer' => 'Instagram',
                ]);
            }

            // customer aggregates from successful orders
            foreach ($customerIds as $cid) {
                $agg = DB::table('orders')
                    ->where('customer_id', $cid)
                    ->where('status', 'success')
                    ->selectRaw('COUNT(*) as c, COALESCE(SUM(total_amount), 0) as s, MIN(paid_at) as f')
                    ->first();
                DB::table('customers')->where('id', $cid)->update([
                    'total_orders' => $agg->c,
                    'total_spent' => $agg->s,
                    'first_purchase_at' => $agg->f,
                    'updated_at' => $now,
                ]);
            }

            // ---------- 10. COURSE ----------
            $courseProductId = $productIds['course'];
            $courseId = $this->upsert('course_details', ['product_id' => $courseProductId], [
                'access_type' => 'lifetime',
                'access_days' => null,
                'certificate_enabled' => true,
                'total_lessons' => 6,
            ]);
            $moduleId = $this->upsert('course_modules', ['course_id' => $courseId, 'title' => 'Getting Started'], [
                'sort_order' => 1,
            ]);

            // one lesson per lesson type (each detail table is unique per lesson)
            $lessonDefs = [
                'video' => 'Welcome Video',
                'text_image' => 'Reading: Design Tokens',
                'audio' => 'Podcast: Systems Thinking',
                'notes_pdf' => 'Cheat Sheet (PDF)',
                'assignment' => 'Assignment: Build a Token Set',
                'quiz' => 'Basics Quiz',
            ];
            $lessonIds = [];
            $order = 1;
            foreach ($lessonDefs as $ltype => $ltitle) {
                $lessonIds[$ltype] = $this->upsert('course_lessons', ['module_id' => $moduleId, 'title' => $ltitle], [
                    'type' => $ltype,
                    'is_published' => true,
                    'is_free_preview' => $order === 1,
                    'sort_order' => $order,
                ]);
                $order++;
            }

            $this->upsert('lesson_videos', ['lesson_id' => $lessonIds['video']], [
                'video_url' => 'https://www.youtube.com/watch?v=dummy123',
                'video_source' => 'youtube',
                'notes' => 'Intro video notes',
                'duration_seconds' => 600,
            ]);

            $textId = $this->upsert('lesson_text_contents', ['lesson_id' => $lessonIds['text_image']], [
                'content' => 'Welcome to the course! Design tokens are the single source of truth for design decisions.',
            ]);
            $this->upsert('lesson_text_images', ['lesson_text_content_id' => $textId, 'image_path' => 'lessons/dummy.png'], [
                'sort_order' => 1,
            ]);

            $this->upsert('lesson_audios', ['lesson_id' => $lessonIds['audio']], [
                'audio_url' => 'https://example.com/audio.mp3',
                'audio_path' => 'audio/dummy.mp3',
                'notes' => 'Audio notes',
                'duration_seconds' => 900,
            ]);

            $noteId = $this->upsert('lesson_notes', ['lesson_id' => $lessonIds['notes_pdf']], [
                'allow_download' => true,
                'description' => 'Key notes and cheat sheet',
            ]);
            $this->upsert('lesson_note_files', ['lesson_note_id' => $noteId, 'file_path' => 'notes/dummy.pdf'], [
                'original_name' => 'cheat-sheet.pdf',
                'sort_order' => 1,
            ]);

            $assignId = $this->upsert('lesson_assignments', ['lesson_id' => $lessonIds['assignment']], [
                'assignment_prompt' => 'Submit your Figma link for review',
                'allow_file_upload' => true,
            ]);

            // quiz
            $quizId = $this->upsert('quizzes', ['lesson_id' => $lessonIds['quiz']], [
                'title' => 'Basics Quiz',
            ]);
            $questionId = $this->upsert('quiz_questions', ['quiz_id' => $quizId, 'question_text' => 'What is a design token?'], [
                'question_image_path' => null,
                'type' => 'single_choice',
                'sort_order' => 1,
            ]);
            $optionDefs = [
                ['A design variable', true],
                ['A payment coupon', false],
                ['A browser plugin', false],
            ];
            $correctOptionId = null;
            foreach ($optionDefs as $i => [$text, $isCorrect]) {
                $optId = $this->upsert('quiz_options', ['question_id' => $questionId, 'option_text' => $text], [
                    'option_image_path' => null,
                    'is_correct' => $isCorrect,
                    'sort_order' => $i + 1,
                ]);
                if ($isCorrect) {
                    $correctOptionId = $optId;
                }
            }

            // enrollment (only created_at column, no updated_at)
            $enrollId = $this->upsert('enrollments', ['course_id' => $courseId, 'customer_id' => $customerIds[0]], [
                'order_id' => $orderIds['KLN-TEST-001'],
                'progress_percent' => 100,
                'access_expires_at' => null,
                'completed_at' => $now,
                'certificate_issued_at' => $now,
                'created_at' => $now,
            ], false);

            $this->upsert('assignment_submissions', ['lesson_assignment_id' => $assignId, 'enrollment_id' => $enrollId], [
                'submission_file_path' => null,
                'submission_text' => 'https://figma.com/test',
                'status' => 'graded',
                'grade_feedback' => 'Great work!',
                'submitted_at' => $now,
            ]);

            // quiz_attempts / quiz_attempt_answers have no created_at/updated_at
            $attemptId = $this->upsert('quiz_attempts', ['quiz_id' => $quizId, 'enrollment_id' => $enrollId], [
                'score' => 100.00,
                'total_questions' => 1,
                'correct_answers' => 1,
                'attempted_at' => $now,
            ], false);
            $this->upsert('quiz_attempt_answers', ['attempt_id' => $attemptId, 'question_id' => $questionId], [
                'selected_option_ids' => json_encode([$correctOptionId]),
                'is_correct' => true,
            ], false);

            // simple text lists
            $textLists = [
                'course_instructions' => ['Watch the lessons in order', 'Complete the assignment for feedback'],
                'course_benefits' => ['Lifetime access', 'Certificate of completion'],
                'course_highlights' => ['6 lessons across all formats', 'Live Q&A included'],
            ];
            foreach ($textLists as $table => $texts) {
                foreach ($texts as $i => $text) {
                    $this->upsert($table, ['course_id' => $courseId, 'text' => $text], [
                        'is_enabled' => true,
                        'sort_order' => $i + 1,
                    ]);
                }
            }
            $this->upsert('course_gallery_items', ['course_id' => $courseId, 'image_path' => 'gallery/dummy.jpg'], [
                'is_enabled' => true,
                'sort_order' => 1,
            ]);
            $this->upsert('course_faqs', ['course_id' => $courseId, 'question' => 'Is this course live?'], [
                'is_enabled' => true,
                'answer' => 'No, the lessons are recorded. A live Q&A is scheduled separately.',
                'sort_order' => 1,
            ]);
            $this->upsert('course_testimonials', ['course_id' => $courseId, 'name' => 'Test Student'], [
                'is_enabled' => true,
                'message' => 'Amazing course!',
                'avatar_path' => null,
                'sort_order' => 1,
            ]);
            $this->upsert('live_classes', ['course_id' => $courseId, 'title' => 'Live Q&A'], [
                'description' => 'Ask me anything about design systems',
                'scheduled_at' => $now->copy()->addDays(2),
                'duration_minutes' => 60,
                'join_link' => 'https://meet.example.com/test',
            ]);

            foreach ($lessonIds as $lid) {
                $this->upsert('lesson_progress', ['enrollment_id' => $enrollId, 'lesson_id' => $lid], [
                    'is_completed' => true,
                    'completed_at' => $now,
                ]);
            }
            // certificates has no created_at/updated_at
            $this->upsert('certificates', ['enrollment_id' => $enrollId], [
                'certificate_number' => 'CERT-TEST-001',
                'file_path' => 'certificates/cert-test-001.pdf',
                'issued_at' => $now,
            ], false);

            // ---------- 11. EVENT ----------
            $eventId = $this->upsert('event_details', ['product_id' => $productIds['event']], [
                'mode' => 'online',
                'starts_at' => $now->copy()->addDays(5),
                'ends_at' => $now->copy()->addDays(5)->addHours(3),
                'join_link' => 'https://meet.example.com/conf',
                'venue_address' => null,
            ]);
            // event_registrations: event_id -> event_details.id, order_id required, no timestamps
            $this->upsert('event_registrations', ['event_id' => $eventId, 'customer_id' => $customerIds[3]], [
                'order_id' => $orderIds['KLN-TEST-004'],
                'attended' => false,
                'registered_at' => $now,
            ], false);

            // ---------- 12. BOOK ----------
            $bookId = $this->upsert('book_details', ['product_id' => $productIds['book']], [
                'author_name' => 'Test Creator',
                'pages' => 120,
                'format' => 'pdf',
                'file_path' => 'books/dummy.pdf',
                'external_link' => null,
            ]);
            // book_downloads: book_id -> book_details.id, order_id required, no timestamps
            $this->upsert('book_downloads', ['book_id' => $bookId, 'order_id' => $orderIds['KLN-TEST-003']], [
                'downloaded_at' => $now,
            ], false);

            // ---------- 13. LOCKED CONTENT ----------
            $lockedId = $this->upsert('locked_content_details', ['product_id' => $productIds['locked_content']], [
                'category' => 'design',
                'public_teaser' => 'Unlock the full enterprise token repository.',
                'hidden_message' => 'Here is your secret content!',
                'hidden_video_url' => 'https://example.com/secret-video',
            ]);
            $this->upsert('locked_content_images', ['locked_content_id' => $lockedId, 'image_path' => 'locked/dummy.jpg'], [
                'sort_order' => 1,
            ]);
            $this->upsert('locked_content_files', ['locked_content_id' => $lockedId, 'file_path' => 'locked/dummy.zip'], [
                'original_name' => 'tokens.zip',
            ]);
            // locked_content_unlocks: order_id required, no timestamps
            $this->upsert('locked_content_unlocks', ['locked_content_id' => $lockedId, 'order_id' => $orderIds['KLN-TEST-008']], [
                'unlocked_at' => $now,
            ], false);

            // ---------- 14. BOOKING ----------
            $bookingServiceId = $this->upsert('booking_service_details', ['product_id' => $productIds['booking']], [
                'duration_minutes' => 60,
                'is_active' => true,
            ]);

            // weekday: 0 = Sunday ... 6 = Saturday (Carbon dayOfWeek); Mon-Fri enabled
            for ($day = 0; $day <= 6; $day++) {
                $enabled = $day >= 1 && $day <= 5;
                $this->upsert('creator_availability', ['user_id' => $userId, 'weekday' => $day], [
                    'timezone' => 'Asia/Kolkata',
                    'is_enabled' => $enabled,
                    'start_time' => $enabled ? '10:00:00' : null,
                    'end_time' => $enabled ? '18:00:00' : null,
                ]);
            }
            $this->upsert('availability_exceptions', ['user_id' => $userId, 'date' => $now->copy()->addDays(3)->toDateString()], [
                'is_blocked' => true,
                'reason' => 'Holiday',
            ]);

            $bookingId = $this->upsert('bookings', ['booking_service_id' => $bookingServiceId, 'order_id' => $orderIds['KLN-TEST-002']], [
                'creator_id' => $userId,
                'customer_id' => $customerIds[1],
                'scheduled_at' => $now->copy()->addDays(2),
                'duration_minutes' => 60,
                'meeting_link' => 'https://meet.example.com/mentorship',
                'status' => 'upcoming',
            ]);
            $this->upsert('booking_responses', ['booking_id' => $bookingId, 'question_label' => 'What do you want to discuss?'], [
                'answer' => 'Portfolio review',
            ]);

            // ---------- 15. AUTO-DM ----------
            $ruleId = $this->upsert('autodm_rules', ['user_id' => $userId, 'trigger_keyword' => 'GUIDE'], [
                'instagram_post_id' => 'post_test_001',
                'dm_message' => 'Thanks for your interest! Here is the guide link.',
                'linked_product_id' => $productIds['book'],
                'is_active' => true,
            ]);
            // autodm_logs has no created_at/updated_at
            $this->upsert('autodm_logs', ['rule_id' => $ruleId, 'instagram_username' => '@testfollower'], [
                'comment_text' => 'GUIDE',
                'dm_sent' => true,
                'triggered_at' => $now,
            ], false);

            // ---------- 16. SUB ADMIN ----------
            $this->upsert('sub_admins', ['creator_id' => $userId, 'email' => 'helper@gmail.com'], [
                'user_id' => $helperId,
                'status' => 'active',
                'invite_token' => null,
                'invited_at' => $now,
                'accepted_at' => $now,
            ]);
        });
    }

    /**
     * Find a row by $where and update it, otherwise insert ($where + $data). Returns the row id.
     *
     * @param bool $timestamps true for tables that have created_at + updated_at.
     *                         Pass false for tables without them (or with only created_at / other
     *                         custom time columns) and put those columns in $data yourself.
     */
    private function upsert(string $table, array $where, array $data, bool $timestamps = true): int
    {
        $existing = DB::table($table)->where($where)->first();

        if ($existing) {
            // This seeder writes products directly, bypassing Product::creating.
            // Keep an existing UUID stable across re-seeds; repair legacy rows
            // that predate the UUID migration.
            if ($table === 'products') {
                $data['uuid'] = $existing->uuid ?: (string) Str::uuid();
            }
            if ($timestamps) {
                $data['updated_at'] = now();
            }
            if (!empty($data)) {
                DB::table($table)->where('id', $existing->id)->update($data);
            }
            return (int) $existing->id;
        }

        if ($timestamps) {
            $data['created_at'] = now();
            $data['updated_at'] = now();
        }

        // Direct DB inserts bypass the Product model's automatic UUID hook.
        if ($table === 'products') {
            $data['uuid'] ??= (string) Str::uuid();
        }

        return (int) DB::table($table)->insertGetId($where + $data);
    }
}
