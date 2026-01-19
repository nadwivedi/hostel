const StatCard = ({ title, value, icon, gradient, bgLight }) => (
  <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-0.5 whitespace-nowrap">{title}</p>
          <p className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`w-8 h-8 sm:w-16 sm:h-16 rounded-2xl ${gradient} flex items-center justify-center shadow-lg mt-4 sm:mt-2`}>
          <span className="text-lg sm:text-3xl">{icon}</span>
        </div>
      </div>
      <div className={`mt-2 sm:mt-4 h-1.5 sm:h-2 rounded-full ${bgLight}`}>
        <div
          className={`h-full rounded-full ${gradient} transition-all duration-500`}
          style={{ width: '100%' }}
        ></div>
      </div>
    </div>
  </div>
);

export default StatCard;
