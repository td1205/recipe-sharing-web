import React from 'react';

const SkeletonLoader = () => {
  return (
    <div style={{ minHeight: '100vh', padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '30px', width: '100%', background: '#1b2838' }}>
      {/* Giả lập tiêu đề */}
      <div className="steam-skeleton" style={{ width: '30%', height: '30px', marginBottom: '10px' }}></div>
      
      {/* Giả lập bộ lọc hoặc công cụ */}
      <div style={{ display: 'flex', gap: '15px' }}>
        <div className="steam-skeleton" style={{ width: '120px', height: '40px' }}></div>
        <div className="steam-skeleton" style={{ width: '120px', height: '40px' }}></div>
        <div className="steam-skeleton" style={{ width: '120px', height: '40px' }}></div>
      </div>

      {/* Giả lập danh sách grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="steam-skeleton" style={{ width: '100%', height: '200px' }}></div>
            <div className="steam-skeleton" style={{ width: '80%', height: '20px' }}></div>
            <div className="steam-skeleton" style={{ width: '50%', height: '15px' }}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonLoader;
