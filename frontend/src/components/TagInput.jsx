import React, { useState } from 'react';
import './TagInput.css';

export const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 50;

const normalizeTag = (value) => value.replace(/^#+/, '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Ô nhập tag cho form đăng/sửa công thức.
 * Gõ tag rồi nhấn Enter hoặc dấu phẩy để thêm; Backspace khi ô trống để xoá tag cuối.
 */
const TagInput = ({ id, value = [], onChange, placeholder = 'vd: thịt gà, món chay, nhanh gọn' }) => {
  const [draft, setDraft] = useState('');

  const addTags = (text) => {
    const next = [...value];
    text.split(',').map(normalizeTag).forEach((tag) => {
      if (tag && tag.length <= MAX_TAG_LENGTH && !next.includes(tag) && next.length < MAX_TAGS) next.push(tag);
    });
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };

  const removeTag = (tag) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTags(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="tag-input">
      <div className="tag-input-box">
        {value.map((tag) => (
          <span key={tag} className="tag-input-chip">
            #{tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Bỏ tag ${tag}`}>
              <i className="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS && (
          <input
            id={id}
            className="tag-input-field"
            value={draft}
            maxLength={MAX_TAG_LENGTH}
            placeholder={value.length === 0 ? placeholder : ''}
            onChange={(e) => (e.target.value.includes(',') ? addTags(e.target.value) : setDraft(e.target.value))}
            onKeyDown={handleKeyDown}
            onBlur={() => draft && addTags(draft)}
          />
        )}
      </div>
      <p className="tag-input-hint">
        Nhấn Enter hoặc dấu phẩy để thêm. Tối đa {MAX_TAGS} tag ({value.length}/{MAX_TAGS}).
      </p>
    </div>
  );
};

export default TagInput;
