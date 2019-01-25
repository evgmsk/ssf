import React, { Component, Fragment } from 'react';
import socket from 'socket.io-client';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isEditing: false,
            posts: [],
            totalPosts: 0,
            editPost: null,
            status: '',
            postPage: 1,
            postsLoading: true,
            editLoading: false,
            newPostAdded: 0,
            postsPerPage: 2
        };
        this.loadPosts = this.loadPosts.bind(this);
    }

    componentDidMount() {
        fetch('http://localhost:8080/auth/status', {
            headers: {
                Authorization: 'Bearer ' + this.props.token
            }
        })
            .then(res => {
                if (res.status !== 200) {
                    throw new Error('Failed to fetch user status.');
                }
                return res.json();
            })
            .then(resData => {
                this.setState({ status: resData.status });
            })
            .catch(this.catchError);

        this.loadPosts();
        const io = socket('http://localhost:8080');
        io.on('posts', data => {
            if (data.action === 'create') {
                this.addPost(data.post);
            }
        })
    }

    addPost = post => {
        const { totalPosts, newPostAdded } = this.state;
        this.setState({ totalPosts: totalPosts + 1, newPostAdded: newPostAdded + 1 })
    };

    loadPosts = (direction, last = false) => {
        let { postPage, totalPosts, postsPerPage, newPostAdded } = this.state;
        if (direction) {
            postPage = direction === 'next' ? postPage + 1 : postPage - 1;
            this.setState({ postsLoading: true, posts: [] });
        } else if (last) {
            postPage = Math.ceil(totalPosts / postsPerPage);
            newPostAdded = 0;
        }
        fetch('http://localhost:8080/feed/posts?page=' + postPage, {
            headers: {
                Authorization: 'Bearer ' + this.props.token
            }
        })
            .then(res => {
                if (res.status !== 200) {
                    throw new Error('Failed to fetch posts.');
                }
                return res.json();
            })
            .then(resData => {
                this.setState({
                    posts: resData.posts.map(post => {
                        return {
                            ...post,
                            imagePath: post.imageUrl
                        };
                    }),
                    totalPosts: resData.totalItems,
                    postsLoading: false,
                    postPage,
                    newPostAdded
                });
            })
            .catch(this.catchError);
    };

    statusUpdateHandler = event => {
        event.preventDefault();
        fetch('http://localhost:8080/auth/status', {
            method: 'PATCH',
            headers: {
                Authorization: 'Bearer ' + this.props.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: this.state.status
            })
        })
            .then(res => {
                if (res.status !== 200 && res.status !== 201) {
                    throw new Error("Can't update status!");
                }
                return res.json();
            })
            .then(resData => {
                console.log(resData);
            })
            .catch(this.catchError);
    };

    newPostHandler = () => {
        this.setState({ isEditing: true });
    };

    startEditPostHandler = postId => {
        this.setState(prevState => {
            const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

            return {
                isEditing: true,
                editPost: loadedPost
            };
        });
    };

    setNumberPostsPerPage = (postsPerPage) => {
        this.setState({ postsPerPage })
    };

    cancelEditHandler = () => {
        this.setState({ isEditing: false, editPost: null });
    };

    finishEditHandler = postData => {
        const { postsPerPage } = this.state;
        this.setState({
            editLoading: true
        });
        const formData = new FormData();
        formData.append('title', postData.title);
        formData.append('content', postData.content);
        formData.append('image', postData.image);
        let url = 'http://localhost:8080/feed/post';
        let method = 'POST';
        if (this.state.editPost) {
            url = 'http://localhost:8080/feed/post/' + this.state.editPost._id;
            method = 'PUT';
        }

        fetch(url, {
            method: method,
            body: formData,
            headers: {
                Authorization: 'Bearer ' + this.props.token
            }
        })
            .then(res => {
                if (res.status !== 200 && res.status !== 201) {
                    throw new Error('Creating or editing a post failed!');
                }
                return res.json();
            })
            .then(resData => {
                console.log(resData);
                const post = {
                    _id: resData.post._id,
                    title: resData.post.title,
                    content: resData.post.content,
                    creator: resData.post.creator,
                    createdAt: resData.post.createdAt
                };
                this.setState(prevState => {
                    let updatedPosts = [...prevState.posts];
                    if (prevState.editPost) {
                        const postIndex = prevState.posts.findIndex(
                            p => p._id === prevState.editPost._id
                        );
                        updatedPosts[postIndex] = post;
                    } else if (prevState.posts.length < postsPerPage) {
                        updatedPosts = prevState.posts.concat(post);
                    }
                    return {
                        posts: updatedPosts,
                        isEditing: false,
                        editPost: null,
                        editLoading: false
                    };
                });
            })
            .catch(err => {
                console.log(err);
                this.setState({
                    isEditing: false,
                    editPost: null,
                    editLoading: false,
                    error: err
                });
            });
    };

    statusInputChangeHandler = (input, value) => {
        this.setState({ status: value });
    };

    deletePostHandler = postId => {
        this.setState({ postsLoading: true });
        fetch('http://localhost:8080/feed/post/' + postId, {
            method: 'DELETE',
            headers: {
                Authorization: 'Bearer ' + this.props.token
            }
        })
            .then(res => {
                if (res.status !== 200 && res.status !== 201) {
                    throw new Error('Deleting a post failed!');
                }
                return res.json();
            })
            .then(resData => {
                console.log(resData);
                this.setState(prevState => {
                    const updatedPosts = prevState.posts.filter(p => p._id !== postId);
                    return { posts: updatedPosts, postsLoading: false };
                });
            })
            .catch(err => {
                console.log(err);
                this.setState({ postsLoading: false });
            });
    };

    errorHandler = () => {
        this.setState({ error: null });
    };

    catchError = error => {
        this.setState({ error: error });
    };

    render() {
        const expiryDate = localStorage.getItem('expiryDate');
        const {
            isEditing,
            editPost,
            editLoading,
            newPostAdded,
            postsPerPage,
            postPage,
            totalPosts,
            status,
            postsLoading,
            posts
        } = this.state;
        console.log(expiryDate, Date.now(), new Date(expiryDate).getTime(), );
        return (
            <Fragment>
                <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
                <FeedEdit
                    editing={isEditing}
                    selectedPost={editPost}
                    loading={editLoading}
                    onCancelEdit={this.cancelEditHandler}
                    onFinishEdit={this.finishEditHandler}
                    showNew={this.showLast}
                />
                <section className="feed__status">
                    <form onSubmit={this.statusUpdateHandler}>
                        <Input
                            type="text"
                            placeholder="Your status"
                            control="input"
                            onChange={this.statusInputChangeHandler}
                            value={status}
                        />
                        <Button mode="flat" type="submit">
                            Update
                        </Button>
                    </form>
                </section>
                <section className="feed__control">
                    <Button mode="raised" design="accent" onClick={this.newPostHandler}>
                        New Post
                    </Button>
                </section>
                <section className="feed">
                    {postsLoading && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <Loader />
                        </div>
                    )}
                    {posts.length <= 0 && !this.state.postsLoading ? (
                        <p style={{ textAlign: 'center' }}>No posts found.</p>
                    ) : null}
                    {!postsLoading && (
                        <Paginator
                            onPrevious={() => this.loadPosts('previous')}
                            onNext={() => this.loadPosts('next')}
                            lastPage={Math.ceil(totalPosts / postsPerPage)}
                            currentPage={postPage}
                            newPostsAdded={newPostAdded}
                            showNew={() => this.loadPosts(0, 1)}
                        >
                            {posts.map(post => (
                                <Post
                                    key={post._id}
                                    id={post._id}
                                    author={post.creator.name}
                                    date={new Date(post.createdAt).toLocaleDateString('en-US')}
                                    title={post.title}
                                    image={post.imageUrl}
                                    content={post.content}
                                    onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                                    onDelete={this.deletePostHandler.bind(this, post._id)}
                                />
                            ))}
                        </Paginator>
                    )}
                </section>
            </Fragment>
        );
    }
}

export default Feed;
