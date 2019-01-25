import React from 'react';

import './Paginator.css';

const paginator = props => {
    console.log(props.newPostsAdded && 'added', props, typeof props.newPostsAdded);
    return (
    <div className="paginator">
        {props.children}
    <div className="paginator__controls">
        {props.currentPage > 1 && (
            <button className="paginator__control" onClick={props.onPrevious}>
                Previous
            </button>
        )}
        {props.currentPage < props.lastPage && (
            <button className="paginator__control" onClick={props.onNext}>
                Next
            </button>
        )}
        {props.newPostsAdded > 0 && (
            <button className="paginator__control new" onClick={props.showNew}>
                View New <span className="new-post-notification">{props.newPostsAdded}</span>
            </button>
        )}
    </div>
    </div>
    );
};

export default paginator;
