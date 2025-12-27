import React from 'react';

interface RestaurantWelcomeProps {
  onCreateAccount?: () => void;
  onLogIn?: () => void;
  onContinueAsGuest?: () => void;
}

const RestaurantWelcome: React.FC<RestaurantWelcomeProps> = ({
  onCreateAccount,
  onLogIn,
  onContinueAsGuest,
}) => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl">
          {/* Hero Section / Header Image */}
          <div className="relative w-full h-[55vh] flex flex-col justify-end overflow-hidden">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center z-0"
              data-alt="Gourmet dish beautifully plated in dim lighting"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCe92UJobDAkCjd7inDEibpkvtCn3eD8FnhBlDwN6ujs6424zQdGuXI3Q3DR7BOt1_iugj0gU_vLUbFfOR0G_NBietH5Ie_otFS1iAkP9lphe0riWheopYd8hSp_iQQLAfDT9MgjR_eCyTN5owYkhiMN9tXT6Aw3x-IoqaeyzHvK5Blb5H3qPDPWeej7m54vpOwn-CkmQCazQqnseZ9AEY0Xg0YN4nCER3s6NUSCjJgbgBpu8SJkL-PwuSugmFKNNwUZU3PiFDhsgM")',
              }}
            ></div>
            {/* Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent z-10"></div>
            {/* Content */}
            <div className="relative z-20 px-6 pb-6">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: '32px' }}
                >
                  restaurant_menu
                </span>
                <span className="text-white text-lg font-bold tracking-wider uppercase">
                  GourmetApp
                </span>
              </div>
              <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight mb-2">
                Experience Dining <br />
                <span className="text-primary">Redefined.</span>
              </h1>
              <p className="text-gray-300 text-base font-normal max-w-[300px]">
                The ultimate companion for food lovers. Reserve, order, and explore with ease.
              </p>
            </div>
          </div>

          {/* Feature Section */}
          <div className="flex-1 px-6 py-6 bg-background-light dark:bg-background-dark relative z-20 -mt-4 rounded-t-3xl border-t border-white/5">
            <h2 className="text-slate-900 dark:text-white text-lg font-bold mb-4">
              Why join us?
            </h2>
            <div className="space-y-4">
              {/* Feature 1 */}
              <div className="flex items-start gap-4 p-3 rounded-xl bg-white dark:bg-[#2c211c] border border-gray-200 dark:border-[#54433b] shadow-sm">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white text-sm font-bold">
                    Instant Reservations
                  </h3>
                  <p className="text-slate-500 dark:text-[#b9a69d] text-xs mt-1">
                    Book your perfect table in seconds without the hassle of calling.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-4 p-3 rounded-xl bg-white dark:bg-[#2c211c] border border-gray-200 dark:border-[#54433b] shadow-sm">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">menu_book</span>
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white text-sm font-bold">
                    Visual Menu
                  </h3>
                  <p className="text-slate-500 dark:text-[#b9a69d] text-xs mt-1">
                    Explore chef-curated dishes with high-quality photos before you order.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-4 p-3 rounded-xl bg-white dark:bg-[#2c211c] border border-gray-200 dark:border-[#54433b] shadow-sm">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">room_service</span>
                </div>
                <div>
                  <h3 className="text-slate-900 dark:text-white text-sm font-bold">
                    Seamless Service
                  </h3>
                  <p className="text-slate-500 dark:text-[#b9a69d] text-xs mt-1">
                    Request service or pay your bill directly from your phone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Button Group Sticky Bottom */}
          <div className="px-6 py-6 pb-10 bg-background-light dark:bg-background-dark mt-auto">
            <div className="flex flex-col gap-3">
              <button
                onClick={onCreateAccount}
                className="flex w-full cursor-pointer items-center justify-center rounded-lg h-12 px-5 bg-primary hover:bg-orange-600 transition-colors text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/20"
              >
                <span className="truncate">Create an Account</span>
              </button>
              <button
                onClick={onLogIn}
                className="flex w-full cursor-pointer items-center justify-center rounded-lg h-12 px-5 bg-slate-200 dark:bg-[#392e28] hover:bg-slate-300 dark:hover:bg-[#4a3b34] transition-colors text-slate-900 dark:text-white text-base font-bold leading-normal tracking-[0.015em]"
              >
                <span className="truncate">Log In</span>
              </button>
              <button
                onClick={onContinueAsGuest}
                className="flex w-full cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-transparent text-slate-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-semibold leading-normal tracking-[0.015em]"
              >
                <span className="truncate">Continue as Guest</span>
              </button>
            </div>
            {/* Home Indicator Safe Area (Simulated) */}
            <div className="h-1 w-1/3 bg-slate-300 dark:bg-gray-700 mx-auto rounded-full mt-6"></div>
          </div>
      </div>
    </div>
  );
};

export default RestaurantWelcome;

