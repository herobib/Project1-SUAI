import React, { useState } from 'react';
import './Dropdown.css'; // Импортируем стили

interface DropdownProps {
  options: string[];
  onSelect: (option: string) => void;
}

export const Dropdown: React.FC<DropdownProps> = ({ options, onSelect }) => {
  // Стейт для отслеживания: открыто меню или закрыто
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // Стейт для хранения выбранного элемента
  const [selectedOption, setSelectedOption] = useState<string>('Выберите модуль');

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    setIsOpen(false);
    onSelect(option); // Передаем выбранное значение наверх (родительскому компоненту)
  };

  return (
    <div className="dropdown-container">
      {/* Кнопка, которая открывает/закрывает список */}
      <button className="dropdown-button" onClick={toggleDropdown}>
        <span className="dropdown-text">
          {selectedOption}
        </span>
        <span className={`arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {/* Сам выпадающий список, который рендерится только если isOpen === true */}
      {isOpen && (
        <ul className="dropdown-menu">
          {options.map((option, index) => (
            <li 
              key={index} 
              className="dropdown-item" 
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};