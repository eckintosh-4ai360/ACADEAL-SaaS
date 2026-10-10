"use client";

import React from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  name?: string;
  selected?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  required?: boolean;
  dateFormat?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  showYearDropdown?: boolean;
  showMonthDropdown?: boolean;
  dropdownMode?: "scroll" | "select";
  showTimeSelect?: boolean;
  showTimeSelectOnly?: boolean;
  timeIntervals?: number;
  timeCaption?: string;
}

export function DatePicker({
  id,
  name,
  selected,
  onChange,
  placeholder = "Select date",
  required = false,
  dateFormat = "MM/dd/yyyy",
  className,
  minDate,
  maxDate,
  showYearDropdown = true,
  showMonthDropdown = true,
  dropdownMode = "select",
  showTimeSelect = false,
  showTimeSelectOnly = false,
  timeIntervals = 15,
  timeCaption = "Time",
  ...props
}: DatePickerProps) {
  return (
    <div className="relative">
      <ReactDatePicker
        id={id}
        name={name}
        selected={selected}
        onChange={onChange}
        dateFormat={dateFormat}
        placeholderText={placeholder}
        required={required}
        minDate={minDate}
        maxDate={maxDate}
        showYearDropdown={showYearDropdown}
        showMonthDropdown={showMonthDropdown}
        dropdownMode={dropdownMode}
        showTimeSelect={showTimeSelect}
        showTimeSelectOnly={showTimeSelectOnly}
        timeIntervals={timeIntervals}
        timeCaption={timeCaption}
        portalId="datepicker-portal"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        wrapperClassName="w-full"
        {...props}
      />
    </div>
  );
}

